import {NotificationsWorker} from '../../src/modules/notifications/notifications.worker.js';
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { databaseFixture } from '../helpers/database.js';
import { stableId } from '../../src/database/seed.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={token:string;id:string};
let owner:Actor,customer:Actor,worker:Actor,outsider:Actor;
const skill=stableId('socket_replacement'),point={latitude:21.0285,longitude:105.8542};
const future=()=>new Date(Date.now()+86400000).toISOString();
async function call(actor:Actor|null,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{...(actor?{Authorization:`Bearer ${actor.token}`}:{ }),'Content-Type':'application/json','Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};
}
async function account(name:string){const r=await call(null,'/auth/register','POST',{email:name+'@example.test',password:'jobs local test password 2026',display_name:name});assert.equal(r.status,201);await f.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[r.body.user.id,'+849'+String(Math.random()).slice(2,10)]);return {token:r.body.access_token,id:r.body.user.id};}
beforeEach(async()=>{f=await databaseFixture('notifications-test-secret'.repeat(3));await f.app.get(NotificationsWorker).onModuleDestroy();owner=await account('owner');customer=await account('customer');worker=await account('worker');outsider=await account('outsider');});
afterEach(async()=>{await f?.close();});
async function ready(kind='solo'){
 let r=await call(owner,'/partners','POST',{kind,name:'DEMO job provider'});assert.equal(r.status,201);let p=r.body;
 for(const [action,body] of Object.entries({skills:{skills:[{skill_id:skill,modes:['at_customer','custom','at_shop']}]},'service-areas':{areas:[{label:'DEMO Hanoi',center:point,radius_m:5000}]},locations:{locations:[{address:{text:'DEMO public shop',point},public:true},{address:{text:'PRIVATE_CANARY',point},public:false}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}})){
 r=await call(owner,`/partners/${p.id}/${action}`,'PUT',{expected_version:p.version,...body});assert.equal(r.status,200,JSON.stringify(r));p=r.body;
 }
 return p;
}
function request(p:{id:string},extra={}){return {partner_id:p.id,skills:[{skill_id:skill,schema_version:1,answers:{}}],service_mode:'at_customer',address:{text:'DEMO customer address',point},time_mode:'now',note:'DEMO replace socket',...extra};}
async function create(p:{id:string},extra={}){const r=await call(customer,'/jobs','POST',request(p,extra));assert.equal(r.status,201,JSON.stringify(r));return r.body;}
async function change(actor:Actor,j:{id:string;version:number},action:string,extra={},key=randomUUID()){return call(actor,`/jobs/${j.id}/${action}`,'POST',{expected_version:j.version,...extra},key);}
async function room(actor=customer){const r=await call(actor,'/conversations');assert.equal(r.status,200,JSON.stringify(r));return r.body.items[0];}
const ajv=new Ajv({strict:false});addFormats.default(ajv);
const spec=JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8'));ajv.addSchema(spec,'spec');
function matches(name:string,value:unknown){const valid=ajv.compile({$ref:`spec#/components/schemas/${name}`});assert.ok(valid(value),JSON.stringify(valid.errors));}
const drain=()=>f.app.get(NotificationsWorker).drain();
test('notification settings keep four independent switches, isolate accounts and preserve inbox with push disabled',async()=>{
 const p=await ready(),j=await create(p),c=await room();
 const initial=await call(customer,'/me/notification-settings');matches('Settings',initial.body);assert.deepEqual(initial.body,{message_push:true,call_push:true,service_push:true,reminder_push:true});
 const settings={...initial.body,reminder_push:false,message_push:false};const key=randomUUID();
 assert.equal((await call(customer,'/me/notification-settings','PUT',settings,key)).status,200);
 assert.deepEqual((await call(customer,'/me/notification-settings','PUT',settings,key)).body,settings);
 assert.equal((await call(customer,'/me/notification-settings','PUT',{...settings,service_push:false},key)).status,409);
 assert.deepEqual((await call(customer,'/me/notification-settings')).body,settings);
 assert.deepEqual((await call(owner,'/me/notification-settings')).body,initial.body);
 assert.equal((await call(customer,'/me/notification-settings','PUT',{...settings,reminder_push:'false'})).status,400);
 const {reminder_push,...legacy}=settings;void reminder_push;assert.equal((await call(customer,'/me/notification-settings','PUT',legacy)).status,400);
 assert.equal((await call(null,'/me/notifications')).status,401);
 await call(owner,`/conversations/${c.id}/messages`,'POST',{client_message_id:randomUUID(),body:'PRIVATE_CANARY',job_id:j.id});await drain();
 const page=(await call(customer,'/me/notifications')).body;matches('listNotificationsPage',page);assert.equal(page.items.length,0);assert.equal((await room()).unread,1);assert.ok(!JSON.stringify(page).includes('PRIVATE_CANARY'));
 assert.equal((await call(owner,'/me/notifications')).body.items.filter((n:{kind:string})=>n.kind==='conversation.message_created.v1').length,0);
});
test('inbox commit is atomic, retry and competing consumers dedupe, read and pagination are actor scoped',async()=>{
 const p=await ready();
 for(let i=0;i<3;i++)await create(p);
 await f.pool.query(`CREATE FUNCTION fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test inbox failure'; END $$; CREATE TRIGGER fail_notice BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_notice()`);
 await assert.rejects(drain());assert.equal((await f.pool.query('SELECT count(*) FROM notification_deliveries WHERE processed_at IS NOT NULL')).rows[0].count,'0');
 await f.pool.query('DROP TRIGGER fail_notice ON notifications; DROP FUNCTION fail_notice()');
 const competing=new NotificationsWorker(f.pool,f.logs.log);await Promise.all([drain(),competing.drain()]);await drain();
 assert.equal((await f.pool.query('SELECT count(*) FROM notifications')).rows[0].count,'3');
 assert.equal((await f.pool.query('SELECT count(*) FROM outbox_events WHERE processed_at IS NOT NULL')).rows[0].count,'0');
 const first=(await call(owner,'/me/notifications?limit=1')).body;assert.ok(first.next_cursor);const second=(await call(owner,'/me/notifications?limit=1&cursor='+encodeURIComponent(first.next_cursor))).body;assert.notEqual(first.items[0].id,second.items[0].id);
 assert.equal((await call(customer,'/me/notifications?cursor='+encodeURIComponent(first.next_cursor))).status,400);
 const path=`/me/notifications/${first.items[0].id}/read`,key=randomUUID();assert.equal((await call(outsider,path,'POST')).status,404);
 const read=await call(owner,path,'POST',undefined,key);matches('Ack',read.body);assert.equal(read.status,200);const before=(await f.pool.query('SELECT read_at FROM notifications WHERE id=$1',[first.items[0].id])).rows[0].read_at;
 assert.deepEqual(await call(owner,path,'POST',undefined,key),read);await call(owner,path,'POST');assert.deepEqual((await f.pool.query('SELECT read_at FROM notifications WHERE id=$1',[first.items[0].id])).rows[0].read_at,before);
});
test('notification recipients are captured at event commit and revoked members cannot receive delayed job or partner chat notices',async()=>{
 const p=await ready('company');const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,worker.id])).rows[0];
 await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'jobs.manage',$2)",[m.id,owner.id]);
 let j=await create(p);const c=await room();j=(await change(owner,j,'accept',{eta:future()})).body;
 await call(customer,`/conversations/${c.id}/messages`,'POST',{client_message_id:randomUUID(),body:'DEMO team'});
 await f.pool.query('UPDATE memberships SET active=false WHERE id=$1',[m.id]);
 const added=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,outsider.id])).rows[0];await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'jobs.manage',$2)",[added.id,owner.id]);
 await drain();assert.equal((await call(worker,'/me/notifications')).body.items.length,0);assert.equal((await call(outsider,'/me/notifications')).body.items.length,0);
 assert.equal((await call(owner,'/me/notifications')).body.items.length,2);
 const membership=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1 AND user_id=$2',[p.id,owner.id])).rows[0];
 await change(owner,j,'assignments',{membership_id:membership.id});await drain();
 assert.equal((await call(customer,'/me/notifications')).body.items.filter((n:{kind:string})=>n.kind==='job.assigned.v1').length,1);
});
test('reminders use future lead times, invalidate rescheduled and stopped jobs, and never close work by time',async()=>{
 const p=await ready();let j=await create(p,{time_mode:'scheduled',scheduled_at:new Date(Date.now()+48*3600000).toISOString()});j=(await change(owner,j,'accept')).body;
 assert.equal((await f.pool.query('SELECT count(*) FROM reminders WHERE job_id=$1 AND state=\'pending\'',[j.id])).rows[0].count,'2');
 j=(await change(customer,j,'reschedule',{scheduled_at:new Date(Date.now()+2*3600000).toISOString(),reason:'DEMO new time'})).body;
 const rows=(await f.pool.query('SELECT schedule_version,lead_seconds,state FROM reminders WHERE job_id=$1 ORDER BY schedule_version,lead_seconds',[j.id])).rows;assert.equal(rows.filter(r=>r.state==='pending').length,1);assert.equal(rows.find(r=>r.state==='pending').lead_seconds,3600);
 await f.pool.query("UPDATE reminders SET due_at=now()-interval '1 second' WHERE job_id=$1",[j.id]);await drain();await drain();
 let page=(await call(customer,'/me/notifications')).body.items;assert.equal(page.filter((n:{kind:string})=>n.kind==='reminder.1h').length,1);assert.equal(page.filter((n:{kind:string})=>n.kind==='reminder.24h').length,0);
 await drain();assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1 AND kind=\'reminder.1h\'',[customer.id])).rows[0].count,'1');
 j=(await change(customer,j,'reschedule',{scheduled_at:new Date(Date.now()+48*3600000).toISOString(),reason:'DEMO later'})).body;
 await f.pool.query("UPDATE reminders SET due_at=now()-interval '1 second' WHERE job_id=$1 AND state='pending'",[j.id]);await drain(); // queued, not yet delivered
 j=(await change(customer,j,'stop',{reason:'DEMO stop',has_agreed_charges:true})).body;await drain();
 page=(await call(customer,'/me/notifications')).body.items;assert.equal(page.filter((n:{kind:string})=>n.kind==='reminder.24h').length,0);assert.equal(j.state,'accepted');
 const another=await create(p,{time_mode:'scheduled',scheduled_at:new Date(Date.now()+1800000).toISOString()});await change(owner,another,'accept');assert.equal((await f.pool.query('SELECT count(*) FROM reminders WHERE job_id=$1',[another.id])).rows[0].count,'0');
});

test('chat never enters inbox and legacy chat rows and pending deliveries remain excluded',async()=>{
 const p=await ready();const c=(await call(customer,'/conversations','POST',{partner_id:p.id})).body;
 await call(owner,`/conversations/${c.id}/messages`,'POST',{client_message_id:randomUUID(),body:'DEMO chat only'});
 assert.equal((await f.pool.query("SELECT count(*) FROM notification_deliveries WHERE kind LIKE 'conversation.%'")).rows[0].count,'0');
 const legacy=(await f.pool.query("INSERT INTO notifications(user_id,event_key,kind,resource_ref) VALUES($1,'legacy','conversation.message_created.v1',$2) RETURNING id",[customer.id,{conversation_id:c.id}])).rows[0];
 await f.pool.query("INSERT INTO notification_deliveries(user_id,event_key,kind,resource_ref) VALUES($1,'legacy-pending','conversation.message_created.v1',$2)",[customer.id,{conversation_id:c.id}]);
 await drain();
 assert.equal((await call(customer,'/me/notifications?limit=1')).body.items.length,0);
 assert.equal((await call(customer,`/me/notifications/${legacy.id}/read`,'POST')).status,404);
 assert.equal((await f.pool.query("SELECT count(*) FROM notifications WHERE event_key='legacy-pending'")).rows[0].count,'0');
 assert.equal((await f.pool.query("SELECT processed_at IS NOT NULL AS retired FROM notification_deliveries WHERE event_key='legacy-pending'")).rows[0].retired,true);
 assert.equal((await room()).unread,1);
 await call(customer,`/conversations/${c.id}/read`,'PUT',{last_sequence:1});
 assert.equal((await room()).unread,0);
});
