import {randomUUID} from 'node:crypto';
import type {OnModuleInit,OnModuleDestroy} from '@nestjs/common';
import type {Pool} from 'pg';
import {resourceAccess} from '../realtime/realtime.access.js';
import type {Resource} from './notifications.store.js';
import type {AppLog} from '../../logging/logger.js';
export type PushConfig={accessToken?:string};
export class PushWorker implements OnModuleInit,OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;private running?:Promise<void>;
 constructor(private readonly pool:Pool,private readonly log:AppLog,private readonly config?:PushConfig,private readonly transport:typeof fetch=fetch){}
 onModuleInit(){if(this.config){this.timer=setInterval(()=>{void this.drain().catch(e=>this.log.error(e));},1000);this.timer.unref();}}
 async onModuleDestroy(){clearInterval(this.timer);await this.running?.catch(()=>{});}
 drain(){if(!this.running)this.running=this.process().finally(()=>{this.running=undefined;});return this.running;}
 private async allowed(id:string){
  const db=await this.pool.connect();try{await db.query('BEGIN');
   const d=(await db.query(`SELECT p.*,d.token,d.user_id AS device_user,u.locale FROM push_deliveries p JOIN push_devices d ON d.id=p.device_id
    JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND d.user_id=p.user_id AND d.revoked_at IS NULL AND u.status='active'
    AND EXISTS(SELECT 1 FROM sessions s WHERE s.family_id=d.family_id AND s.user_id=d.user_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
    AND p.created_at>clock_timestamp()-interval '24 hours'`,[id])).rows[0];
   if(!d){await db.query('COMMIT');return null;}
   const settings=(await db.query('SELECT * FROM notification_settings WHERE user_id=$1',[d.user_id])).rows[0];
   const field=d.kind.startsWith('call.')?'call_push':d.kind.startsWith('conversation.')?'message_push':d.kind.startsWith('reminder.')?'reminder_push':'service_push';
   if(settings?.[field]===false){await db.query('COMMIT');return null;}
   const r:Resource=d.resource_ref;
   if(d.kind==='call.incoming.v1'&&!(await db.query("SELECT 1 FROM calls WHERE id::text=split_part($1,':',2) AND state='ringing' AND recipient_id=$2 AND ring_until>clock_timestamp()",[d.event_key,d.user_id])).rowCount){await db.query('COMMIT');return null;}
   const resource=r.report_id?{type:'report' as const,id:r.report_id}:r.verification_id?{type:'verification' as const,id:r.verification_id}:r.conversation_id?{type:'conversation' as const,id:r.conversation_id}:r.job_id?{type:'job' as const,id:r.job_id}:null;
   if(!resource){await db.query('COMMIT');return null;}
   await resourceAccess(db,d.user_id,resource);
   if(r.job_id&&r.schedule_version!==undefined){const j=(await db.query('SELECT state,schedule_version,scheduled_at,stop_has_agreed_charges FROM jobs WHERE id=$1',[r.job_id])).rows[0];if(!j||j.state!=='accepted'||j.stop_has_agreed_charges!==null||j.schedule_version!==r.schedule_version||j.scheduled_at<=new Date()){await db.query('COMMIT');return null;}}
   await db.query('COMMIT');return d;
  }catch(e){await db.query('ROLLBACK');if(e instanceof Error&&e.name==='NotFoundException')return null;throw e;}finally{db.release();}
 }
 private async api(path:string,body:unknown){
  const response=await this.transport('https://exp.host/--/api/v2/push/'+path,{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(this.config?.accessToken?{Authorization:'Bearer '+this.config.accessToken}:{})},body:JSON.stringify(body)});
  if(!response.ok)throw new Error('PUSH_TRANSPORT');return await response.json() as {data:unknown};
 }
 private async process(){if(!this.config)return;
  for(let n=0;n<50;n++){
   const lease=randomUUID(),d=(await this.pool.query(`UPDATE push_deliveries SET lease_token=$1,lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1
    WHERE id=(SELECT id FROM push_deliveries WHERE state IN ('pending','ticket') AND next_attempt_at<=clock_timestamp()
    AND (lease_until IS NULL OR lease_until<clock_timestamp()) ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`,[lease])).rows[0];if(!d)return;
   const finish=async(state:string,code:string|null=null,ticket:string|null=d.ticket_id)=>{await this.pool.query(`UPDATE push_deliveries SET state=$3,error_code=$4,ticket_id=$5,lease_until=NULL,
    next_attempt_at=clock_timestamp()+interval '15 minutes' WHERE id=$1 AND lease_token=$2`,[d.id,lease,state,code,ticket]);};
   try{
    const target=await this.allowed(d.id);if(!target){await finish('skipped');continue;}
    let result:{status?:string;id?:string;details?:{error?:string}}|undefined;
    if(d.state==='ticket'){
     const response=await this.api('getReceipts',{ids:[d.ticket_id]});result=(response.data as Record<string,typeof result>)?.[d.ticket_id];
     if(!result){if(d.attempts>=8)await finish('failed','RECEIPT_TIMEOUT');else await finish('ticket');continue;}
    }else{
     const response=await this.api('send',[{to:target.token,title:'Dịch vụ quanh bạn',body:target.kind==='call.incoming.v1'?(target.locale==='ja'?'着信があります。':target.locale==='en'?'Incoming call.':'Bạn có cuộc gọi đến.'):(target.locale==='ja'?'新しい更新があります。':target.locale==='en'?'You have a new update.':'Bạn có cập nhật mới.'),sound:'default',data:{recipient_id:target.user_id,...target.resource_ref,event_key:target.event_key}}]);result=Array.isArray(response.data)?response.data[0]:undefined;
    }
    if(result?.status==='ok'){
     if(d.state==='ticket')await finish('delivered');else if(typeof result.id==='string')await finish('ticket',null,result.id);else throw new Error('PUSH_RESPONSE');
    }else if(result?.status==='error'){
     const code=result.details?.error;
     if(code==='DeviceNotRegistered')await this.pool.query('UPDATE push_devices SET revoked_at=now() WHERE id=$1 AND token=$2 AND user_id=$3',[d.device_id,target.token,d.user_id]);
     if(code==='MessageRateExceeded')throw new Error('PUSH_RATE');
     await finish('failed',['DeviceNotRegistered','MessageTooBig','InvalidCredentials','MismatchSenderId'].includes(code??'')?code!:'PROVIDER_ERROR');
    }else throw new Error('PUSH_RESPONSE');
   }catch{
    // Never log tokens, payloads, provider response bodies or credentials.
    await this.pool.query(`UPDATE push_deliveries SET state=CASE WHEN attempts>=8 THEN 'failed' ELSE state END,error_code='TRANSPORT_OR_ACCESS',lease_until=NULL,
     next_attempt_at=clock_timestamp()+make_interval(secs=>$3) WHERE id=$1 AND lease_token=$2`,[d.id,lease,Math.min(900,2**d.attempts)+Math.random()]);
   }
  }
 }
}
