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
beforeEach(async()=>{f=await databaseFixture('jobs-chat-test-secret'.repeat(3));owner=await account('owner');customer=await account('customer');worker=await account('worker');outsider=await account('outsider');});
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
test('all three modes, public profile contract, phone guard, self hire, current schema and geographic eligibility',async()=>{
 const p=await ready('shop'),profile=(await call(customer,`/partners/${p.id}`)).body;
 matches('PartnerProfile',profile);assert.equal(profile.public_locations.length,1);assert.ok(!JSON.stringify(profile).includes('PRIVATE_CANARY'));assert.deepEqual(profile.service_modes[0].modes,['at_customer','custom','at_shop']);
 for(const mode of ['at_customer','custom','at_shop']){const j=await create(p,{service_mode:mode,...(mode==='at_shop'?{location_id:profile.public_locations[0].id,address:{text:'forged shop text',point}}:{})});matches('Job',j);assert.equal(j.service_mode,mode);if(mode==='at_shop')assert.equal(j.address.text,'DEMO public shop');}
 assert.equal((await call(owner,'/jobs','POST',request(p))).status,403);
 await f.pool.query("UPDATE identities SET verified_at=NULL WHERE user_id=$1 AND provider='phone'",[customer.id]);assert.equal((await call(customer,'/jobs','POST',request(p))).status,403);
 await f.pool.query("UPDATE identities SET verified_at=now() WHERE user_id=$1 AND provider='phone'",[customer.id]);
 assert.equal((await call(customer,'/jobs','POST',request(p,{address:{text:'Far',point:{latitude:10,longitude:100}}}))).status,409);
 assert.equal((await call(customer,'/jobs','POST',request(p,{skills:[{skill_id:skill,schema_version:2}]}))).status,409);
 assert.equal((await call(customer,'/jobs','POST',request(p,{time_mode:'scheduled',scheduled_at:'2030-02-30T10:00:00Z'}))).status,400);
 const privateId=(await f.pool.query('SELECT id FROM partner_locations WHERE partner_id=$1 AND NOT public',[p.id])).rows[0].id;
 assert.equal((await call(customer,'/jobs','POST',request(p,{service_mode:'at_shop',location_id:privateId}))).status,409);
});
test('create and accept replay exactly once, stale/concurrent writes conflict, ETA persists and agreed costs retain accepted state',async()=>{
 const p=await ready(),key=randomUUID(),input=request(p);
 const a=await call(customer,'/jobs','POST',input,key),b=await call(customer,'/jobs','POST',input,key);assert.equal(a.status,201);assert.deepEqual(a,b);let j=a.body;
 assert.equal((await call(customer,'/jobs','POST',{...input,note:'different'},key)).status,409);
 assert.equal((await change(owner,j,'accept')).status,400);
 await f.pool.query("UPDATE identities SET verified_at=NULL WHERE user_id=$1 AND provider='phone'",[owner.id]);assert.equal((await change(owner,j,'accept',{eta:future()})).status,403);await f.pool.query("UPDATE identities SET verified_at=now() WHERE user_id=$1 AND provider='phone'",[owner.id]);
 const eta=future(),acceptKey=randomUUID(),accepted=await change(owner,j,'accept',{eta},acceptKey);assert.equal(accepted.status,200,JSON.stringify(accepted));assert.deepEqual(await change(owner,j,'accept',{eta},acceptKey),accepted);assert.equal(accepted.body.eta,eta);assert.ok(accepted.body.assigned_member_id);
 assert.equal((await change(customer,j,'withdraw',{reason:'stale'})).status,409);j=accepted.body;
 const attempts=await Promise.all([change(customer,j,'reschedule',{scheduled_at:future(),reason:'first'}),change(owner,j,'reschedule',{scheduled_at:future(),reason:'second'})]);assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);j=attempts.find(x=>x.status===200)!.body;assert.equal(j.schedule_version,2);
 assert.equal((await f.pool.query('SELECT count(*) FROM schedule_history WHERE job_id=$1',[j.id])).rows[0].count,'1');
 const stopped=await change(customer,j,'stop',{reason:'costs agreed',has_agreed_charges:true});assert.equal(stopped.status,201);assert.equal(stopped.body.state,'accepted');
 const done=await change(customer,stopped.body,'stop',{reason:'no charges',has_agreed_charges:false});assert.equal(done.body.state,'stopped');matches('Job',done.body);
 assert.equal((await f.pool.query('SELECT count(*) FROM messages WHERE job_id=$1 AND sender_id IS NULL',[j.id])).rows[0].count,'1');
 assert.equal((await f.pool.query("SELECT count(*) FROM outbox_events WHERE event_type='job.accepted.v1'")).rows[0].count,'1');
 assert.equal((await call(outsider,`/jobs/${j.id}`)).status,404);assert.equal((await call(outsider,`/jobs?partner_id=${p.id}`)).status,404);
});
test('scheduled jobs, decline and withdraw, bound pagination, revoked grant invalidates cached acceptance',async()=>{
 const p=await ready('company');let j=await create(p,{time_mode:'scheduled',scheduled_at:future()});assert.equal((await change(owner,j,'accept')).status,200);
 j=await create(p);assert.equal((await change(owner,j,'decline',{reason:'Unavailable'})).body.state,'declined');
 j=await create(p);assert.equal((await change(customer,j,'withdraw',{reason:'Changed mind'})).body.state,'withdrawn');
 const first=await call(customer,'/jobs?limit=1');assert.equal(first.body.items.length,1);assert.ok(first.body.next_cursor);
 assert.equal((await call(customer,'/jobs?limit=1&cursor='+encodeURIComponent(first.body.next_cursor))).body.items.length,1);
 assert.equal((await call(owner,`/jobs?partner_id=${p.id}&cursor=`+encodeURIComponent(first.body.next_cursor))).status,400);
 const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,worker.id])).rows[0];await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'jobs.accept',$2)",[m.id,owner.id]);
 j=await create(p);const key=randomUUID(),eta=future();assert.equal((await change(worker,j,'accept',{eta},key)).status,200);
 await f.pool.query('UPDATE membership_grants SET revoked_at=now() WHERE membership_id=$1',[m.id]);assert.equal((await change(worker,j,'accept',{eta},key)).status,404);
});
test('assignment gives worker only own job and direct chat; reassignment preserves history but removes job access',async()=>{
 const p=await ready('company'),m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,worker.id])).rows[0];
 let j=await create(p);const inbox=await room();assert.equal(inbox.kind,'partner');assert.equal((await call(worker,`/conversations/${inbox.id}/messages`)).status,404);
 j=(await change(owner,j,'accept',{eta:future()})).body;const assignment=await change(owner,j,'assignments',{membership_id:m.id});assert.equal(assignment.status,201,JSON.stringify(assignment));matches('AssignmentResult',assignment.body);j=assignment.body.job;
 assert.equal((await call(worker,`/jobs/${j.id}`)).status,200);assert.equal((await call(worker,`/jobs?partner_id=${p.id}`)).body.items.length,1);
 const direct=assignment.body.conversation_id;assert.equal((await call(owner,`/conversations/${direct}/messages`)).status,404);
 const text={client_message_id:randomUUID(),body:'Private worker message',job_id:j.id};assert.equal((await call(worker,`/conversations/${direct}/messages`,'POST',text)).status,201);
 const own=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1 AND is_owner',[p.id])).rows[0];assert.equal((await change(owner,j,'assignments',{membership_id:own.id})).status,201);
 assert.equal((await call(worker,`/jobs/${j.id}`)).status,404);assert.equal((await call(worker,`/conversations/${direct}/messages`)).status,200);assert.deepEqual((await room(worker)).job_ids,[]);
 assert.equal((await call(worker,`/conversations/${direct}/messages`,'POST',{...text,client_message_id:randomUUID()})).status,404);
});
test('chat sequences, dedupe, recovery pages, monotonic reads, cross-room/client mismatch and outsider denial',async()=>{
 const p=await ready();const j=await create(p),c=await room();matches('Conversation',c);
 const path=`/conversations/${c.id}/messages`,key=randomUUID(),input={client_message_id:randomUUID(),body:'DEMO hello',job_id:j.id};
 const first=await call(customer,path,'POST',input,key);assert.equal(first.status,201,JSON.stringify(first));matches('Message',first.body);assert.deepEqual(await call(customer,path,'POST',input,key),first);assert.deepEqual(await call(customer,path,'POST',input),first);
 assert.equal((await call(customer,path,'POST',{...input,body:'different'})).status,409);
 const replies=await Promise.all([call(owner,path,'POST',{client_message_id:randomUUID(),body:'reply 1'}),call(customer,path,'POST',{client_message_id:randomUUID(),body:'reply 2'})]);assert.ok(replies.every(r=>r.status===201));
 const all=await call(customer,path);assert.deepEqual(all.body.items.map((m:{sequence:number})=>m.sequence),[1,2,3]);
 const page=await call(customer,path+'?after_sequence=1&limit=1');assert.equal(page.body.items[0].sequence,2);assert.equal((await call(customer,path+'?after_sequence=1&cursor='+encodeURIComponent(page.body.next_cursor))).body.items[0].sequence,3);
 assert.equal((await call(customer,path+'?after_sequence=2&cursor='+encodeURIComponent(page.body.next_cursor))).status,400);
 const read=`/conversations/${c.id}/read`;assert.equal((await call(owner,read,'PUT',{last_sequence:3})).status,200);assert.equal((await call(owner,read,'PUT',{last_sequence:1})).body.version,3);assert.equal((await room(owner)).unread,0);assert.equal((await call(owner,read,'PUT',{last_sequence:4})).status,400);
 assert.equal((await call(outsider,path)).status,404);assert.equal((await call(outsider,path,'POST',input,key)).status,404);
 assert.equal((await call(customer,path,'POST',{client_message_id:randomUUID(),body:'',asset_id:randomUUID()})).status,400);
 const c2=(await call(outsider,'/conversations','POST',{partner_id:p.id})).body;assert.equal((await call(owner,`/conversations/${c2.id}/messages`,'POST',{client_message_id:input.client_message_id,body:'owner different sender'})).status,201);
 const ownerInput={client_message_id:randomUUID(),body:'dedupe across rooms'};assert.equal((await call(owner,path,'POST',ownerInput)).status,201);assert.equal((await call(owner,`/conversations/${c2.id}/messages`,'POST',ownerInput)).status,409);
});
test('outbox failure rolls back message and sequence; same request can recover',async()=>{
 const p=await ready();await create(p);const c=await room(),path=`/conversations/${c.id}/messages`,key=randomUUID(),input={client_message_id:randomUUID(),body:'atomic'};
 await f.pool.query("CREATE FUNCTION fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test outbox failure'; END $$");await f.pool.query('CREATE TRIGGER fail_event BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fail_event()');
 assert.equal((await call(customer,path,'POST',input,key)).status,500);assert.equal((await call(customer,path)).body.items.length,0);
 await f.pool.query('DROP TRIGGER fail_event ON outbox_events');const r=await call(customer,path,'POST',input,key);assert.equal(r.status,201);assert.equal(r.body.sequence,1);
});
