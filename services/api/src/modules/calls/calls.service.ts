import {ConflictException,ForbiddenException,NotFoundException,ServiceUnavailableException,type OnModuleDestroy,type OnModuleInit} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import type {AuthService} from '../auth/auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {Cursor} from '../../common/http/cursor.js';
import {directConversation} from '../chat/chat.store.js';
import {queuePush} from '../notifications/notifications.store.js';
import {callRelation,callTargets} from './calls.access.js';
import type {callCreate,callsQuery,callChange} from './calls.input.js';
import {roomName,type CallMedia} from '../../integrations/livekit/livekit.adapter.js';
type CallRow={id:string;job_id:string;conversation_id:string;caller_id:string;recipient_id:string;caller_family:string;recipient_family:string|null;state:string;version:number;created_at:Date;answered_at:Date|null;ended_at:Date|null;ring_until:Date;caller_heartbeat:Date;recipient_heartbeat:Date|null;media_issued_until:Date|null;cleanup_pending:boolean};
const active=(c:CallRow)=>['ringing','accepted'].includes(c.state);
const dto=(c:CallRow)=>({id:c.id,job_id:c.job_id,conversation_id:c.conversation_id,caller_id:c.caller_id,recipient_id:c.recipient_id,state:c.state,version:c.version,created_at:c.created_at.toISOString(),answered_at:c.answered_at?.toISOString()??null,ended_at:c.ended_at?.toISOString()??null,ring_until:c.ring_until.toISOString()});
export class CallsService implements OnModuleInit,OnModuleDestroy {
 private readonly tx:AccountTransaction;private timer?:ReturnType<typeof setInterval>;private running?:Promise<void>;private unsubscribe?:()=>void;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly media:CallMedia|undefined,private readonly cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
 onModuleInit(){this.unsubscribe=this.auth.onAccessChange(()=>this.sweep());this.timer=setInterval(()=>{void this.sweep().catch(()=>{});},1000);this.timer.unref();}
 async onModuleDestroy(){clearInterval(this.timer);this.unsubscribe?.();await this.running?.catch(()=>{});}
 private async locked(db:PoolClient){await db.query('SELECT pg_advisory_xact_lock(2026102105)');}
 private async readTx<T>(header:string|undefined,work:(db:PoolClient,user:string,session:string)=>Promise<T>){const db=await this.pool.connect();try{await db.query('BEGIN');const a=await this.auth.authenticate(header,db);await this.locked(db);const result=await work(db,a.user.id,a.sessionId);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 private async row(db:PoolClient,id:string,user:string){const c=(await db.query<CallRow>('SELECT * FROM calls WHERE id=$1 AND (caller_id=$2 OR recipient_id=$2) FOR UPDATE',[id,user])).rows[0];if(!c)throw new NotFoundException();return c;}
 private async family(db:PoolClient,session:string){return (await db.query('SELECT family_id FROM sessions WHERE id=$1',[session])).rows[0].family_id as string;}
 private async validFamilies(db:PoolClient,c:CallRow){return !(await db.query(`SELECT 1 FROM (VALUES($1::uuid,$2::uuid),($3::uuid,$4::uuid)) p(user_id,family) WHERE family IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.user_id=p.user_id AND s.family_id=p.family AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.scope='app' AND u.status='active')`,[c.caller_id,c.caller_family,c.recipient_id,c.recipient_family])).rowCount;}
 private async finish(db:PoolClient,c:CallRow,state:string){
  if(!active(c))return c;
  const next=(await db.query<CallRow>('UPDATE calls SET state=$2,version=version+1,ended_at=clock_timestamp(),cleanup_pending=media_issued_until IS NOT NULL WHERE id=$1 RETURNING *',[c.id,state])).rows[0];
  await db.query('DELETE FROM active_call_users WHERE call_id=$1',[c.id]);await this.changed(db,next);return next;
 }
 private async changed(db:PoolClient,c:CallRow){
  // Private, minimal event; media URL, JWT and participant session families never enter the outbox.
  await db.query(`INSERT INTO outbox_events(event_key,aggregate_id,aggregate_version,event_type,payload,correlation_id) VALUES($1,$2,$3,'call.updated.v1',$4,gen_random_uuid()) ON CONFLICT(event_key) DO NOTHING`,[`call:${c.id}:${c.version}`,c.id,c.version,JSON.stringify({call_id:c.id,conversation_id:c.conversation_id,job_id:c.job_id,state:c.state,version:c.version})]);
  const e=(await db.query('SELECT id FROM outbox_events WHERE event_key=$1',[`call:${c.id}:${c.version}`])).rows[0];
  await db.query(`INSERT INTO realtime_deliveries(event_id,user_id,resource_type,resource_id) VALUES($1,$2,'conversation',$4),($1,$3,'conversation',$4) ON CONFLICT DO NOTHING`,[e.id,c.caller_id,c.recipient_id,c.conversation_id]);
 }
 private async ensureActive(db:PoolClient,c:CallRow){
  if(!active(c))return c;
  let valid=true;try{await callRelation(db,c);}catch(e){if(e instanceof NotFoundException)valid=false;else throw e;}
  if(!valid||!await this.validFamilies(db,c))return this.finish(db,c,'revoked');
  if(c.state==='ringing'&&c.ring_until.getTime()<=Date.now())return this.finish(db,c,'no_answer');
  if(c.state==='accepted'&&(c.caller_heartbeat.getTime()<Date.now()-45000||(c.recipient_heartbeat?.getTime()??0)<Date.now()-45000))return this.finish(db,c,'failed');
  return c;
 }
 targets(header:string|undefined,id:string){return this.readTx(header,async(db,user)=>({items:await callTargets(db,id,user)}));}
 async create(header:string|undefined,input:ReturnType<typeof callCreate>,key:string){
  if(!this.media)throw new ServiceUnavailableException({code:'CALLS_UNAVAILABLE'});
  await this.sweep();
  return this.tx.run(header,'startCall',key,input,async(db,a)=>{
   const targets=await callTargets(db,input.job_id,a.user.id);
   const recipient=input.recipient_id??targets.find(t=>t.role===(input.target==='worker'?'assigned':'contact'))?.user_id;
   if(!recipient||!targets.some(t=>t.user_id===recipient))throw new NotFoundException();
   const conversation=await directConversation(db,a.user.id,recipient);
   await db.query('INSERT INTO job_conversations(job_id,conversation_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[input.job_id,conversation]);
   const occupied=(await db.query('SELECT user_id FROM active_call_users WHERE user_id=ANY($1::uuid[])',[ [a.user.id,recipient] ])).rows;
   if(occupied.some(o=>o.user_id===a.user.id))throw new ConflictException({code:'STATE_CONFLICT'});
   const state=occupied.length?'busy':'ringing';
   const c=(await db.query<CallRow>(`INSERT INTO calls(job_id,conversation_id,caller_id,recipient_id,caller_family,state,ended_at) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6='busy' THEN clock_timestamp() END) RETURNING *`,[input.job_id,conversation,a.user.id,recipient,await this.family(db,a.sessionId),state])).rows[0];
   if(state==='ringing'){
    await db.query('INSERT INTO active_call_users(user_id,call_id) VALUES($1,$3),($2,$3)',[a.user.id,recipient,c.id]);
    // call_push filters delivery in PushWorker; it does not remove the call or its history.
    await queuePush(db,`call:${c.id}:ringing`,'call.incoming.v1',{conversation_id:conversation,job_id:input.job_id},[{user_id:recipient}]);
   }
   await this.changed(db,c);return dto(c);
  },async(db,a)=>{await this.locked(db);const targets=await callTargets(db,input.job_id,a.user.id);if(input.recipient_id&&!targets.some(t=>t.user_id===input.recipient_id))throw new NotFoundException();const old=(await db.query("SELECT response_snapshot->>'id' AS id FROM idempotency_keys WHERE actor_id=$1 AND operation='startCall' AND request_key=$2",[a.user.id,key])).rows[0];if(old){const c=await this.row(db,old.id,a.user.id);await callRelation(db,c);}});
 }
 async get(header:string|undefined,id:string){await this.sweep();return this.readTx(header,async(db,user)=>dto(await this.row(db,id,user)));}
 async list(header:string|undefined,q:ReturnType<typeof callsQuery>){await this.sweep();return this.readTx(header,async(db,user)=>{
  const scope=`calls:${user}:${q.conversation_id??''}:${q.active}`,start=this.cursor.decode(q.cursor,scope);
  const rows=(await db.query<CallRow>(`SELECT * FROM calls WHERE (caller_id=$1 OR recipient_id=$1) AND ($2::uuid IS NULL OR conversation_id=$2) AND (NOT $3::boolean OR state IN ('ringing','accepted')) AND ($4::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($4::timestamptz,$5::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $6`,[user,q.conversation_id??null,q.active,start?.created_at??null,start?.id??null,q.limit+1])).rows;
  const page=rows.slice(0,q.limit),last=page.at(-1);return {items:page.map(dto),next_cursor:rows.length>q.limit&&last?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 async change(header:string|undefined,id:string,action:'accept'|'decline'|'end'|'fail',input:ReturnType<typeof callChange>,key:string){
  await this.sweep();
  const result=await this.tx.run(header,`call.${id}.${action}`,key,input,async(db,a)=>{
   const c=await this.row(db,id,a.user.id);if(c.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
   if(!active(c)||(['accept','decline'].includes(action)&&c.state!=='ringing'))throw new ConflictException({code:'STATE_CONFLICT'});
   if(action==='accept'){
    const next=(await db.query<CallRow>(`UPDATE calls SET state='accepted',version=version+1,answered_at=clock_timestamp(),recipient_family=$2,caller_heartbeat=clock_timestamp(),recipient_heartbeat=clock_timestamp() WHERE id=$1 RETURNING *`,[id,await this.family(db,a.sessionId)])).rows[0];await this.changed(db,next);return dto(next);
   }
   return dto(await this.finish(db,c,action==='decline'?'declined':action==='fail'?'failed':'ended'));
  },async(db,a)=>{
   await this.locked(db);const c=await this.row(db,id,a.user.id);
   if(['accept','decline'].includes(action)&&a.user.id!==c.recipient_id)throw new ForbiddenException();
   // Ending one's media remains allowed after relationship revocation. Accept/replay always checks current access.
   if(['accept','decline'].includes(action))await callRelation(db,c);
  });
  await this.cleanup();return result;
 }
 async mediaToken(header:string|undefined,id:string){
  if(!this.media)throw new ServiceUnavailableException({code:'CALLS_UNAVAILABLE'});
  await this.sweep();
  return this.readTx(header,async(db,user,session)=>{
   const c=await this.row(db,id,user);await callRelation(db,c);if(c.state!=='accepted')throw new ConflictException({code:'STATE_CONFLICT'});
   if(await this.family(db,session)!==(user===c.caller_id?c.caller_family:c.recipient_family))throw new ForbiddenException();
   let result;try{result=await this.media!.token(roomName(id),user);}catch{throw new ServiceUnavailableException({code:'CALLS_UNAVAILABLE'});}
   await db.query(`UPDATE calls SET media_issued_until=clock_timestamp()+interval '35 seconds',caller_heartbeat=CASE WHEN caller_id=$2 THEN clock_timestamp() ELSE caller_heartbeat END,recipient_heartbeat=CASE WHEN recipient_id=$2 THEN clock_timestamp() ELSE recipient_heartbeat END WHERE id=$1`,[id,user]);
   return {call_id:id,...result};
  });
 }
 async heartbeat(header:string|undefined,id:string){await this.sweep();return this.readTx(header,async(db,user,session)=>{
  const c=await this.row(db,id,user);if(c.state==='accepted'){
   await callRelation(db,c);if(await this.family(db,session)!==(user===c.caller_id?c.caller_family:c.recipient_family))throw new ForbiddenException();
   await db.query(`UPDATE calls SET caller_heartbeat=CASE WHEN caller_id=$2 THEN clock_timestamp() ELSE caller_heartbeat END,recipient_heartbeat=CASE WHEN recipient_id=$2 THEN clock_timestamp() ELSE recipient_heartbeat END WHERE id=$1`,[id,user]);
  }return dto(c);
 });}
 sweep(){if(!this.running)this.running=this.process().finally(()=>{this.running=undefined;});return this.running;}
 private async process(){
  const db=await this.pool.connect();try{await db.query('BEGIN');await this.locked(db);
   const rows=(await db.query<CallRow>("SELECT * FROM calls WHERE state IN ('ringing','accepted') ORDER BY id FOR UPDATE")).rows;
   for(const c of rows)await this.ensureActive(db,c);await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  await this.cleanup();
 }
 private async cleanup(){if(!this.media)return;const rows=(await this.pool.query<CallRow>('SELECT * FROM calls WHERE cleanup_pending ORDER BY ended_at LIMIT 100')).rows;
  for(const c of rows){try{await this.media.close(roomName(c.id));await this.pool.query('UPDATE calls SET cleanup_pending=COALESCE(media_issued_until>clock_timestamp(),false) WHERE id=$1',[c.id]);}catch{/* Durable retry: the next worker pass closes this room again. Never log media credentials. */}}
 }
}
