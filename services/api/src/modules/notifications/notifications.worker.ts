import {event} from '../../common/events/event.store.js';
import { NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { jobAccess } from '../jobs/jobs.access.js';
import { jobRecipients, queueNotice, type Resource } from './notifications.store.js';
import type { AppLog } from '../../logging/logger.js';

export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  constructor(private readonly pool: Pool, private readonly log: AppLog) {}
  onModuleInit() { this.timer=setInterval(()=>{void this.drain().catch(error=>this.log.error(error));},1000); this.timer.unref(); }
  async onModuleDestroy() { clearInterval(this.timer); await this.running?.catch(()=>{}); }
  drain() {
    if (!this.running) this.running=this.process().finally(()=>{this.running=undefined;});
    return this.running;
  }
  private async transaction(work: (db:PoolClient)=>Promise<boolean>) {
    const db=await this.pool.connect();
    try {await db.query('BEGIN');const value=await work(db);await db.query('COMMIT');return value;}
    catch(error){await db.query('ROLLBACK');throw error;} finally{db.release();}
  }
  private async process() {
    // Bound each tick. DB rows and uniqueness survive restart or competing workers.
    for(let i=0;i<100;i++) if(!await this.transaction(async db=>{
      const d=(await db.query(`SELECT * FROM notification_deliveries WHERE processed_at IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`)).rows[0];
      if(!d)return false;
      // Retire queued legacy chat deliveries without creating a bell item.
      let allowed=!d.kind.startsWith('conversation.') && !!(await db.query("SELECT 1 FROM users WHERE id=$1 AND status='active' FOR KEY SHARE",[d.user_id])).rowCount;
      const ref:Resource=d.resource_ref;
      if(allowed)try {
        if(ref.job_id){
          const a=await jobAccess(db,ref.job_id,d.user_id);
          if(ref.schedule_version!==undefined)allowed=a.job.state==='accepted' && a.job.stop_has_agreed_charges===null && a.job.schedule_version===ref.schedule_version && a.job.scheduled_at>new Date();
        } else allowed=false;
      } catch(error){if(error instanceof NotFoundException)allowed=false;else throw error;}
      if(allowed){const {rows:[n]}=await db.query(`INSERT INTO notifications(user_id,event_key,kind,resource_ref) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id`,[d.user_id,d.event_key,d.kind,d.resource_ref]);
        if(n)await event(db,`notice:${n.id}`,n.id,1,'notification.created.v1',{notification_id:n.id});}
      await db.query('UPDATE notification_deliveries SET processed_at=clock_timestamp() WHERE id=$1',[d.id]);
      return true;
    }))break;
    for(let i=0;i<100;i++) if(!await this.transaction(async db=>{
      // Read candidate without locking, then take the same partner -> job -> reminder order as mutations.
      const candidate=(await db.query("SELECT r.id,j.id AS job_id,j.partner_id FROM reminders r JOIN jobs j ON j.id=r.job_id WHERE r.state='pending' AND r.due_at<=clock_timestamp() ORDER BY r.due_at,r.id LIMIT 1")).rows[0];
      if(!candidate)return false;
      await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[candidate.partner_id]);
      const j=(await db.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[candidate.job_id])).rows[0];
      const r=(await db.query("SELECT * FROM reminders WHERE id=$1 AND state='pending' FOR UPDATE",[candidate.id])).rows[0];
      if(!r)return true;
      const valid=j.state==='accepted' && j.stop_has_agreed_charges===null && j.schedule_version===r.schedule_version && j.scheduled_at>new Date();
      if(valid) await queueNotice(db,`reminder:${r.id}`,r.lead_seconds===86400?'reminder.24h':'reminder.1h',
        {job_id:j.id,schedule_version:r.schedule_version,lead_seconds:r.lead_seconds},await jobRecipients(db,j.id));
      await db.query('UPDATE reminders SET state=$2 WHERE id=$1',[r.id,valid?'sent':'superseded']);
      return true;
    }))break;
  }
}
