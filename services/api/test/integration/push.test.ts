import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {PushWorker} from '../../src/modules/notifications/push.worker.js';
import {NotificationsWorker} from '../../src/modules/notifications/notifications.worker.js';
import {resourceAccess} from '../../src/modules/realtime/realtime.access.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={id:string;token:string};
async function call(a:Actor|null,path:string,method='GET',body?:unknown,key=randomUUID()){const r=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':key,...(a?{Authorization:'Bearer '+a.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};}
async function user():Promise<Actor>{const r=await call(null,'/auth/register','POST',{email:randomUUID()+'@example.test',password:'DEMO push password 2026',display_name:'DEMO push'});assert.equal(r.status,201);return {id:r.body.user.id,token:r.body.access_token};}
const device=(suffix='abcdefghijk')=>({token:`ExpoPushToken[${suffix}]`,platform:'android'});
async function report(a:Actor){const r=await call(a,'/reports','POST',{kind:'account',subject:'PRIVATE_SUBJECT',body:'PRIVATE_BODY'});assert.equal(r.status,201);return r.body;}
beforeEach(async()=>{f=await databaseFixture('push-test-secret-'.repeat(4));await f.app.get(NotificationsWorker).onModuleDestroy();});afterEach(async()=>{await f.close();});
test('Expo pilot persists registration, minimal report push and receipts; events and inbox remain private and settings are rechecked',async()=>{
 const a=await user(),other=await user(),key=randomUUID(),d=device();assert.equal((await call(null,'/me/devices','POST',d)).status,401);
 assert.equal((await call(a,'/me/devices','POST',{...d,token:'https://attacker.test'})).status,400);
 const registered=await call(a,'/me/devices','POST',d,key);assert.equal(registered.status,201);assert.deepEqual(await call(a,'/me/devices','POST',d,key),registered);
 assert.ok(!JSON.stringify(registered).includes(d.token));const r=await report(a);
 const outbox=(await f.pool.query("SELECT * FROM outbox_events WHERE event_type='report.updated.v1'")).rows[0];assert.deepEqual(outbox.payload,{report_id:r.id,resource_version:1});
 const recipients=(await f.pool.query('SELECT user_id FROM realtime_deliveries WHERE event_id=$1',[outbox.id])).rows;assert.deepEqual(recipients,[{user_id:a.id}]);
 const db=await f.pool.connect();try{await resourceAccess(db,a.id,{type:'report',id:r.id});await assert.rejects(resourceAccess(db,other.id,{type:'report',id:r.id}));}finally{db.release();}
 const requests:{url:string;body:unknown}[]=[];
 const transport=(async(url,init)=>{const body=JSON.parse(String(init?.body));requests.push({url:String(url),body});return Response.json({data:String(url).endsWith('send')?[{status:'ok',id:'ticket-demo'}]:{'ticket-demo':{status:'ok'}}});}) as typeof fetch;
 const worker=new PushWorker(f.pool,f.logs.log,{},transport);await worker.drain();assert.equal(requests.length,1);
 assert.ok(!JSON.stringify(requests).includes('PRIVATE_'));const payload=(requests[0].body as {data:unknown}[])[0];assert.deepEqual(payload.data,{recipient_id:a.id,report_id:r.id,event_key:`report:${r.id}:1`});
 assert.equal((await f.pool.query('SELECT state FROM push_deliveries')).rows[0].state,'ticket');
 await f.pool.query('UPDATE push_deliveries SET next_attempt_at=now()');await worker.drain();assert.equal((await f.pool.query('SELECT state FROM push_deliveries')).rows[0].state,'delivered');
 await report(a);await call(a,'/me/notification-settings','PUT',{message_push:true,call_push:true,service_push:false,reminder_push:true});await worker.drain();assert.equal(requests.length,2);
 await f.app.get(NotificationsWorker).drain();assert.equal((await call(a,'/me/notifications')).body.items.length,2);assert.equal((await call(other,'/me/notifications')).body.items.length,0);
 assert.ok(!f.logs.text().includes(d.token));
});
test('push retries transport failures, revokes unregistered devices, and suppresses logged-out or reassigned tokens',async()=>{
 const a=await user(),b=await user(),d=device();await call(a,'/me/devices','POST',d);await report(a);
 let calls=0;const transport=(async()=>{calls++;if(calls===1)throw new Error('network');return Response.json({data:[{status:'error',details:{error:'DeviceNotRegistered'}}]});}) as typeof fetch;
 const worker=new PushWorker(f.pool,f.logs.log,{},transport);await worker.drain();assert.equal(calls,1);assert.equal((await f.pool.query('SELECT state FROM push_deliveries')).rows[0].state,'pending');
 await f.pool.query('UPDATE push_deliveries SET next_attempt_at=now()');await worker.drain();assert.equal(calls,2);assert.ok((await f.pool.query('SELECT revoked_at FROM push_devices')).rows[0].revoked_at);
 await call(a,'/me/devices','POST',d);await report(a);await call(b,'/me/devices','POST',d);await worker.drain();assert.equal(calls,2);
 await report(b);await call(b,'/auth/logout','POST');await worker.drain();assert.equal(calls,2);assert.ok((await f.pool.query('SELECT revoked_at FROM push_devices')).rows[0].revoked_at);
});
