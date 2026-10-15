import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { requestContext } from '../../logging/logger.js';
import { jobRecipients, queueEventNotifications } from '../../modules/notifications/notifications.store.js';
export type Resource = {type:'notification'|'conversation'|'job'|'invoice';id:string};
export async function event(db:PoolClient,key:string,id:string,version:number,type:string,payload:unknown) {
  const {rows:[e]}=await db.query(`INSERT INTO outbox_events(event_key,aggregate_id,aggregate_version,event_type,payload,correlation_id)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_key) DO NOTHING RETURNING id`,[key,id,version,type,JSON.stringify(payload),requestContext.getStore()?.request_id??randomUUID()]);
  if(!e)return;
  let recipients:{user_id:string}[]=[],resource:Resource|undefined;
  if(type.startsWith('conversation.')){
    resource={type:'conversation',id};
    recipients=(await db.query<{user_id:string}>(`SELECT u.id AS user_id FROM users u JOIN conversations c ON c.id=$1
      WHERE u.status='active' AND (u.id=c.user_low OR u.id=c.user_high OR u.id=c.customer_id OR EXISTS(
        SELECT 1 FROM memberships m WHERE m.partner_id=c.partner_id AND m.user_id=u.id AND m.active AND (m.is_owner OR EXISTS(
        SELECT 1 FROM membership_grants g WHERE g.membership_id=m.id AND g.revoked_at IS NULL AND g.permission IN ('jobs.accept','jobs.manage')))))`,[id])).rows;
  }else if(type.startsWith('job.')){resource={type:'job',id};recipients=type==='job.assigned.v1'?(await db.query(`SELECT customer_id AS user_id FROM jobs WHERE id=$1 UNION SELECT m.user_id FROM assignments a JOIN memberships m ON m.id=a.membership_id WHERE a.id=$2 AND a.ended_at IS NULL AND m.active`,[id,(payload as {assignment_id:string}).assignment_id])).rows:await jobRecipients(db,id);
  }else if(type.startsWith('invoice.')){
    resource={type:'invoice',id};const j=(await db.query('SELECT job_id FROM invoices WHERE id=$1',[id])).rows[0];
    if(j)recipients=type==='invoice.sent.v1'?(await db.query('SELECT customer_id AS user_id FROM jobs WHERE id=$1',[j.job_id])).rows:await jobRecipients(db,j.job_id);
  }else if(type==='notification.created.v1'||type==='notification.read.v1'){
    resource={type:'notification',id};recipients=(await db.query('SELECT user_id FROM notifications WHERE id=$1',[id])).rows;
  }
  if(resource)for(const r of recipients)await db.query(`INSERT INTO realtime_deliveries(event_id,user_id,resource_type,resource_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[e.id,r.user_id,resource.type,resource.id]);
  // Notification events never produce further notifications.
  if(!type.startsWith('notification.'))await queueEventNotifications(db,key,type,payload);
}
