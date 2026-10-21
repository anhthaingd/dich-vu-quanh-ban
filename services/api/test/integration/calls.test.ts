import {afterEach,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {stableId} from '../../src/database/seed.js';
import {AuthService} from '../../src/modules/auth/auth.service.js';
import {CallsService} from '../../src/modules/calls/calls.service.js';
import {PushWorker} from '../../src/modules/notifications/push.worker.js';
import {Cursor} from '../../src/common/http/cursor.js';
import {roomName,type CallMedia} from '../../src/integrations/livekit/livekit.adapter.js';
import {callCreate,callChange,callsQuery} from '../../src/modules/calls/calls.input.js';
let f:Awaited<ReturnType<typeof databaseFixture>>,service:CallsService;
type Actor={id:string;token:string;header:string;refresh:string};let owner:Actor,customer:Actor,worker:Actor,outsider:Actor;
const point={latitude:21.0285,longitude:105.8542};const k=()=>randomUUID();
const media:CallMedia&{closed:string[]}={closed:[],async token(room,user){return {token:`TEST_MEDIA_ONLY:${room}:${user}`,url:'ws://127.0.0.1:7880',expires_at:new Date(Date.now()+30000).toISOString()};},async close(room){this.closed.push(room);}};
async function http(a:Actor|null,path:string,method='GET',body?:unknown,key=k()){const r=await fetch(f.base+path,{method,headers:{...(a?{Authorization:a.header}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};}
async function actor(name:string){const r=await http(null,'/auth/register','POST',{email:name+'@example.test',password:'DEMO calls password 2026',display_name:name});assert.equal(r.status,201);await f.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[r.body.user.id,'+849'+String(Math.random()).slice(2,10)]);return {id:r.body.user.id,token:r.body.access_token,header:'Bearer '+r.body.access_token,refresh:r.body.refresh_token};}
beforeEach(async()=>{f=await databaseFixture('calls-local-test-secret'.repeat(3));service=new CallsService(f.pool,f.app.get(AuthService),media,new Cursor('calls-cursor-secret'.repeat(3)));media.closed.length=0;owner=await actor('owner');customer=await actor('customer');worker=await actor('worker');outsider=await actor('outsider');});
afterEach(async()=>{await service?.onModuleDestroy();await f?.close();});
async function ready(kind='solo'){
 let p=(await http(owner,'/partners','POST',{kind,name:'DEMO call provider'})).body;
 for(const [action,body] of Object.entries({skills:{skills:[{skill_id:stableId('socket_replacement'),modes:['at_customer']}]},'service-areas':{areas:[{label:'DEMO Hanoi',center:point,radius_m:5000}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}})){const r=await http(owner,`/partners/${p.id}/${action}`,'PUT',{expected_version:p.version,...body});assert.equal(r.status,200,JSON.stringify(r));p=r.body;}
 const request=await http(customer,'/jobs','POST',{partner_id:p.id,skills:[{skill_id:stableId('socket_replacement'),schema_version:1,answers:{}}],service_mode:'at_customer',address:{text:'DEMO address',point},time_mode:'now'});assert.equal(request.status,201,JSON.stringify(request));
 const accepted=await http(owner,`/jobs/${request.body.id}/accept`,'POST',{expected_version:request.body.version,eta:new Date(Date.now()+3600000).toISOString()});assert.equal(accepted.status,200,JSON.stringify(accepted));return {p,j:accepted.body};
}
async function rejected(work:Promise<unknown>,status:number){await assert.rejects(work,(e:unknown)=>!!e&&typeof e==='object'&&'getStatus' in e&&(e.getStatus as ()=>number)()===status);}
const start=(a:Actor,job:string,peer:string,key=k())=>service.create(a.header,{job_id:job,recipient_id:peer},key);
const action=(a:Actor,c:{id:string;version:number},kind:'accept'|'decline'|'end'|'fail',key=k())=>service.change(a.header,c.id,kind,{expected_version:c.version},key);
test('current job targets, both directions, recipient-only acceptance, private history and token isolation',async()=>{
 const {j}=await ready();assert.deepEqual((await service.targets(customer.header,j.id)).items.map(x=>x.role).sort(),['assigned','contact']);
 const input={job_id:j.id,target:'worker' as const},key=k();const c=await service.create(customer.header,input,key);assert.equal(c.state,'ringing');assert.deepEqual(await service.create(customer.header,input,key),c);
 await rejected(action(customer,c,'accept'),403);await rejected(service.mediaToken(customer.header,c.id),409);await rejected(service.get(outsider.header,c.id),404);
 const accepted=await action(owner,c,'accept');assert.equal(accepted.state,'accepted');
 const recipient=await service.mediaToken(owner.header,c.id);assert.ok(recipient.token.endsWith(owner.id));assert.ok(!JSON.stringify(c).includes('token'));
 const snapshots=(await f.pool.query('SELECT response_snapshot FROM idempotency_keys')).rows;assert.ok(!JSON.stringify(snapshots).includes('TEST_MEDIA_ONLY'));
 assert.equal((await service.list(customer.header,{limit:20,active:false,conversation_id:c.conversation_id,cursor:undefined})).items.length,1);
 await action(customer,accepted,'end');assert.ok(media.closed.includes(roomName(c.id)));assert.equal((await f.pool.query('SELECT * FROM active_call_users')).rowCount,0);
 const reverse=await start(owner,j.id,customer.id);assert.equal(reverse.recipient_id,customer.id);assert.equal((await action(customer,reverse,'decline')).state,'declined');
 assert.ok((await f.pool.query("SELECT * FROM outbox_events WHERE event_type='call.updated.v1'")).rows.every(e=>!JSON.stringify(e.payload).includes('token')));
});
test('racing callers and accepting/declining share exclusivity and version checks',async()=>{
 const {j}=await ready();const results=await Promise.allSettled([start(customer,j.id,owner.id),start(owner,j.id,customer.id)]);
 const successful=results.filter(x=>x.status==='fulfilled').map(x=>(x as PromiseFulfilledResult<Awaited<ReturnType<typeof start>>>).value);assert.equal(successful.filter(c=>c.state==='ringing').length,1);
 assert.equal((await f.pool.query('SELECT count(*) FROM active_call_users')).rows[0].count,'2');const c=successful.find(c=>c.state==='ringing')!;const recipient=c.recipient_id===owner.id?owner:customer;
 const states=await Promise.allSettled([action(recipient,c,'accept'),action(recipient,c,'decline')]);assert.equal(states.filter(r=>r.status==='fulfilled').length,1);assert.equal(states.filter(r=>r.status==='rejected').length,1);
});
test('recipient busy creates a history result without stealing the active call',async()=>{
 const {p,j}=await ready();const c=await start(customer,j.id,owner.id);
 const secondCustomer=outsider;const other=(await f.pool.query(`INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode,state) VALUES($1,$2,'at_customer','{}',ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now','accepted') RETURNING id`,[secondCustomer.id,p.id])).rows[0];
 const busy=await start(secondCustomer,other.id,owner.id);assert.equal(busy.state,'busy');assert.ok(busy.ended_at);assert.equal((await f.pool.query('SELECT call_id FROM active_call_users WHERE user_id=$1',[owner.id])).rows[0].call_id,c.id);
});
test('configured contact and assignment are separate, manager cannot join and removed worker keeps only history',async()=>{
 const {p,j}=await ready('company');const member=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,worker.id])).rows[0];
 await f.pool.query('INSERT INTO partner_contacts(partner_id,membership_id) VALUES($1,$2)',[p.id,member.id]);
 const targets=(await service.targets(customer.header,j.id)).items;assert.ok(targets.some(t=>t.user_id===worker.id&&t.role==='contact'));await rejected(start(owner,j.id,customer.id),404);
 const c=await start(customer,j.id,worker.id);let accepted=await action(worker,c,'accept');await service.mediaToken(worker.header,c.id);
 await rejected(service.mediaToken(owner.header,c.id),404);
 await f.pool.query('UPDATE memberships SET active=false WHERE id=$1',[member.id]);await service.sweep();accepted=await service.get(customer.header,c.id);assert.equal(accepted.state,'revoked');await rejected(service.mediaToken(worker.header,c.id),404);
 assert.equal((await service.list(worker.header,{limit:20,active:false,cursor:undefined,conversation_id:c.conversation_id})).items.length,1);assert.ok(media.closed.includes(roomName(c.id)));
});
test('no-answer, media heartbeat failure, completed eligibility and revoked job relation',async()=>{
 const {j}=await ready();let c=await start(customer,j.id,owner.id);await f.pool.query("UPDATE calls SET ring_until=clock_timestamp()-interval '1 second' WHERE id=$1",[c.id]);await service.sweep();assert.equal((await service.get(customer.header,c.id)).state,'no_answer');
 c=await start(customer,j.id,owner.id);c=await action(owner,c,'accept');await f.pool.query("UPDATE calls SET recipient_heartbeat=clock_timestamp()-interval '60 seconds' WHERE id=$1",[c.id]);await service.sweep();assert.equal((await service.get(customer.header,c.id)).state,'failed');
 await f.pool.query("UPDATE jobs SET state='completed' WHERE id=$1",[j.id]);c=await start(customer,j.id,owner.id);await f.pool.query("UPDATE jobs SET state='stopped' WHERE id=$1",[j.id]);await service.sweep();assert.equal((await service.get(customer.header,c.id)).state,'revoked');await rejected(start(customer,j.id,owner.id),404);
});
test('logout invalidates active media, refresh-family binding survives rotation and second session cannot steal media',async()=>{
 const {j}=await ready();const c=await start(customer,j.id,owner.id);const accepted=await action(owner,c,'accept');await service.mediaToken(customer.header,c.id);
 const login=await http(null,'/auth/login','POST',{email:'owner@example.test',password:'DEMO calls password 2026'});assert.equal(login.status,200);await rejected(service.mediaToken('Bearer '+login.body.access_token,c.id),403);
 const refreshed=await http(null,'/auth/refresh','POST',{refresh_token:customer.refresh});assert.equal(refreshed.status,200);customer={...customer,token:refreshed.body.access_token,header:'Bearer '+refreshed.body.access_token};assert.equal((await service.heartbeat(customer.header,c.id)).state,'accepted');
 await http(customer,'/auth/logout','POST');await service.sweep();assert.equal((await service.get(owner.header,c.id)).state,'revoked');assert.ok(media.closed.includes(roomName(accepted.id)));
});
test('replay checks current relationship, mismatch and stale actions fail; cleanup failure remains durable',async()=>{
 const {p,j}=await ready();const key=k(),c=await start(customer,j.id,owner.id,key);await rejected(start(customer,j.id,worker.id,key),404);await rejected(service.create(customer.header,{job_id:j.id,target:'business'},key),409);
 const accepted=await action(owner,c,'accept');await rejected(action(customer,c,'end'),409);await service.mediaToken(customer.header,c.id);
 const failure:CallMedia={token:media.token,async close(){throw new Error('TEST_NETWORK');}};const second=new CallsService(f.pool,f.app.get(AuthService),failure,new Cursor('secret'.repeat(10)));
 await second.change(customer.header,c.id,'end',{expected_version:accepted.version},k());assert.equal((await f.pool.query('SELECT cleanup_pending FROM calls WHERE id=$1',[c.id])).rows[0].cleanup_pending,true);
 await f.pool.query("UPDATE partners SET moderation_status='suspended' WHERE id=$1",[p.id]);await rejected(start(customer,j.id,owner.id,key),404);await service.sweep();assert.ok(media.closed.includes(roomName(c.id)));
});
test('strict input and route contract do not expose media when local provider disabled',async()=>{
 assert.throws(()=>callCreate({job_id:k(),target:'admin'}));assert.throws(()=>callCreate({job_id:k(),target:'worker',recipient_id:k()}));assert.throws(()=>callChange({expected_version:0}));assert.throws(()=>callsQuery({active:'false'}));
 const {j}=await ready();const r=await http(customer,'/calls','POST',{job_id:j.id,target:'worker'});assert.equal(r.status,503);assert.equal((await http(outsider,`/jobs/${j.id}/call-targets`)).status,404);
});

test('incoming call push obeys call switch and suppresses ended or expired ringing before delivery',async()=>{
 const {j}=await ready();assert.equal((await http(owner,'/me/devices','POST',{token:'ExpoPushToken[callpushdemotoken]',platform:'android'})).status,201);
 const sent:{body:string;data:Record<string,unknown>}[]=[];
 const transport=(async(_url,init)=>{sent.push(...JSON.parse(String(init?.body)));return Response.json({data:[{status:'ok',id:'call-demo-ticket'}]});}) as typeof fetch;
 const push=new PushWorker(f.pool,f.logs.log,{},transport);
 let c=await start(customer,j.id,owner.id);await action(owner,c,'decline');await push.drain();assert.equal(sent.length,0);
 c=await start(customer,j.id,owner.id);await f.pool.query("UPDATE calls SET ring_until=now()-interval '1 second' WHERE id=$1",[c.id]);await push.drain();assert.equal(sent.length,0);assert.equal((await service.get(customer.header,c.id)).state,'no_answer');
 await http(owner,'/me/notification-settings','PUT',{message_push:true,call_push:false,service_push:true,reminder_push:true});
 c=await start(customer,j.id,owner.id);await push.drain();assert.equal(sent.length,0);assert.equal((await service.get(owner.header,c.id)).state,'ringing');await action(owner,c,'decline');
 await http(owner,'/me/notification-settings','PUT',{message_push:true,call_push:true,service_push:false,reminder_push:true});
 await f.pool.query("UPDATE users SET locale='en' WHERE id=$1",[owner.id]);c=await start(customer,j.id,owner.id);await push.drain();
 assert.equal(sent.length,1);assert.equal(sent[0].body,'Incoming call.');assert.equal(sent[0].data.event_key,`call:${c.id}:ringing`);assert.equal(sent[0].data.recipient_id,owner.id);assert.ok(!JSON.stringify(sent).includes('TEST_MEDIA_ONLY'));
});
