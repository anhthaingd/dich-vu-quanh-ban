import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { RealtimeGateway } from './realtime.gateway.js';
import type { Resource } from '../../common/events/event.store.js';
import type { AppLog } from '../../logging/logger.js';
export class RealtimeWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;
  private running?:Promise<void>;
  readonly metrics={processed:0,retried:0,failed:0,lastLagMs:0};
  constructor(private readonly pool:Pool,private readonly gateway:RealtimeGateway,private readonly log:AppLog){}
  onModuleInit(){this.timer=setInterval(()=>{void this.drain().catch(e=>this.log.error(e));},100);this.timer.unref();}
  async onModuleDestroy(){clearInterval(this.timer);await this.running?.catch(()=>{});}
  drain(){if(!this.running)this.running=this.process().finally(()=>{this.running=undefined;});return this.running;}
  private async process(){
    for(let i=0;i<100;i++){
      const lease=randomUUID();
      const {rows:[d]}=await this.pool.query(`UPDATE realtime_deliveries SET lease_until=clock_timestamp()+interval '30 seconds',lease_token=$1,attempts=attempts+1
        WHERE id=(SELECT id FROM realtime_deliveries WHERE processed_at IS NULL AND failed_at IS NULL AND next_attempt_at<=clock_timestamp()
        AND (lease_until IS NULL OR lease_until<clock_timestamp()) ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`,[lease]);
      if(!d)return;
      try{
        const e=(await this.pool.query('SELECT * FROM outbox_events WHERE id=$1',[d.event_id])).rows[0];
        await this.gateway.publish(d.user_id,{type:d.resource_type,id:d.resource_id} as Resource,{event_id:e.id,type:e.event_type,occurred_at:e.created_at.toISOString(),aggregate_version:Number(e.aggregate_version),correlation_id:e.correlation_id,data:e.payload});
        await this.pool.query('UPDATE realtime_deliveries SET processed_at=clock_timestamp(),lease_until=NULL WHERE id=$1 AND lease_token=$2',[d.id,lease]);
        this.metrics.processed++;this.metrics.lastLagMs=Date.now()-e.created_at.getTime();
      }catch(e){
        this.log.error(e);this.metrics.retried++;if(d.attempts>=8)this.metrics.failed++;
        await this.pool.query(`UPDATE realtime_deliveries SET lease_until=NULL,next_attempt_at=clock_timestamp()+make_interval(secs=>$3),failed_at=CASE WHEN attempts>=8 THEN clock_timestamp() END WHERE id=$1 AND lease_token=$2`,[d.id,lease,Math.min(60,2**d.attempts)+Math.random()]);
      }
    }
  }
}
