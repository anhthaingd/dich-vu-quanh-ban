import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {Ajv2020} from 'ajv/dist/2020.js';
import formats from 'ajv-formats';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {databaseFixture} from '../helpers/database.js';
import {LocalMessages,MessageSecrets} from '../../src/integrations/local-messages.js';
import {stableId} from '../../src/database/seed.js';
import {ChallengesService} from '../../src/modules/auth/challenges.service.js';
import {AuthService} from '../../src/modules/auth/auth.service.js';
let f:Awaited<ReturnType<typeof databaseFixture>>,dir:string;
const secret='local-message-test-secret-'.repeat(3),contacts=['owner@example.test','worker@example.test','manager@example.test','outsider@example.test','+84900000001','+84900000002'];
const secrets=new MessageSecrets(secret);
type Actor={id:string;token:string;refresh:string;email:string};
let owner:Actor,worker:Actor,manager:Actor,outsider:Actor;
const spec=JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:false});(formats as unknown as (a:typeof ajv)=>void)(ajv);
const contracts=new Map<string,ReturnType<typeof ajv.compile>>();
async function call(a:Actor|null,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':key,...(a?{Authorization:'Bearer '+a.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const result={status:r.status,body:await r.json()};
 if(/invitations|memberships|call-contact|auth\/(challenges|reauthenticate)/.test(path)){
  const template=Object.keys(spec.paths).find(p=>new RegExp('^'+p.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(path.split('?')[0]));
  assert.ok(template);const schema=spec.paths[template][method.toLowerCase()]?.responses[String(r.status)]?.content?.['application/json']?.schema;assert.ok(schema,`Undeclared response ${method} ${template} ${r.status}`);
  const id=template+method+r.status;let validate=contracts.get(id);if(!validate){validate=ajv.compile({...schema,components:spec.components});contracts.set(id,validate);}assert.ok(validate(result.body),JSON.stringify(validate.errors));
 }
 return result;
}
async function account(name:string):Promise<Actor>{const email=name+'@example.test',r=await call(null,'/auth/register','POST',{email,password:'local team test password 2026',display_name:name});assert.equal(r.status,201);return {id:r.body.user.id,token:r.body.access_token,refresh:r.body.refresh_token,email};}
beforeEach(async()=>{dir=await mkdtemp(join(tmpdir(),'dvqb-team-'));f=await databaseFixture('org-auth-test-secret'.repeat(3),false,{secret,contacts,mailpit:'http://127.0.0.1:1',smsDirectory:dir});await f.app.get(LocalMessages).onModuleDestroy();owner=await account('owner');worker=await account('worker');manager=await account('manager');outsider=await account('outsider');});
afterEach(async()=>{await f?.close();await rm(dir,{recursive:true,force:true});});
async function code(id:string,kind='challenge'){
 const row=(await f.pool.query(`SELECT payload_cipher FROM local_deliveries WHERE ${kind}_id=$1`,[id])).rows[0];
 const text=JSON.parse(secrets.decrypt(row.payload_cipher)).text;return kind==='challenge'?text.match(/\d{6}/)[0]:text.match(/[a-f0-9]{64}/)[0];
}
async function verified(a:Actor,contact=a.email){const c=await call(a,'/auth/challenges','POST',{contact,purpose:'verify'});assert.equal(c.status,201,JSON.stringify(c));const value=await code(c.body.id);const r=await call(a,'/auth/challenges/verify','POST',{challenge_id:c.body.id,code:value});assert.equal(r.status,200,JSON.stringify(r));return c.body;}
async function partner(){await verified(owner,'+84900000001');const r=await call(owner,'/partners','POST',{kind:'company',name:'DEMO team'});assert.equal(r.status,201);return r.body;}
async function invite(p:string,a=worker){const r=await call(owner,`/partners/${p}/invitations`,'POST',{contact:a.email,permissions:[]});assert.equal(r.status,201,JSON.stringify(r));return {...r.body,token:await code(r.body.id,'invitation')};}
async function joinTeam(p:string,a=worker){await verified(a);const i=await invite(p,a);const r=await call(a,'/invitations/accept','POST',{token:i.token});assert.equal(r.status,200,JSON.stringify(r));return r.body;}
test('OTP verifies only its contact and family; wrong attempts persist, expiration, resend and quotas survive service restart',async()=>{
 const c=await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'});assert.equal(c.status,201);const otp=await code(c.body.id),input={challenge_id:c.body.id,code:otp};
 assert.equal((await call(outsider,'/auth/challenges/verify','POST',input)).body.code,'CHALLENGE_INVALID');
 const other=await call(null,'/auth/login','POST',{email:worker.email,password:'local team test password 2026'});
 assert.equal((await call({...worker,token:other.body.access_token},'/auth/challenges/verify','POST',input)).body.code,'CHALLENGE_INVALID');
 assert.equal((await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'})).status,429);
 const restarted=new ChallengesService(f.pool,f.app.get(AuthService),f.app.get(LocalMessages));
 await assert.rejects(restarted.request('Bearer '+worker.token,{contact:worker.email,purpose:'verify',provider:'email'},'127.0.0.1'),(e:unknown)=>!!e&&typeof e==='object'&&'getStatus' in e&&(e as {getStatus:()=>number}).getStatus()===429);
 for(let i=0;i<5;i++)assert.equal((await call(worker,'/auth/challenges/verify','POST',{...input,code:otp==='000000'?'111111':'000000'})).status,400);
 assert.equal((await call(worker,'/auth/challenges/verify','POST',input)).status,400);
 await f.pool.query("UPDATE auth_rate_events SET created_at=created_at-interval '61 seconds'");
 const requested=await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'}),next=requested.body;
 const pair=await Promise.all([call(worker,'/auth/challenges/verify','POST',{challenge_id:next.id,code:await code(next.id)}),call(worker,'/auth/challenges/verify','POST',{challenge_id:next.id,code:await code(next.id)})]);assert.deepEqual(pair.map(r=>r.status).sort(),[200,400]);
 const me=(await call(worker,'/me')).body;assert.equal(me.email_verified,true);assert.equal(me.phone_verified,false);
 assert.equal((await call(worker,'/auth/challenges/verify','POST',{challenge_id:next.id,code:await code(next.id)})).status,400);
 await f.pool.query("UPDATE auth_rate_events SET created_at=created_at-interval '61 seconds'");
 const expired=await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'});
 await f.pool.query("UPDATE auth_challenges SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[expired.body.id]);
 assert.equal((await call(worker,'/auth/challenges/verify','POST',{challenge_id:expired.body.id,code:await code(expired.body.id)})).body.code,'CHALLENGE_EXPIRED');
 assert.equal((await call(worker,'/auth/challenges','POST',{contact:owner.email,purpose:'verify'})).status,400);
 assert.equal((await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'recover'})).status,400);
 assert.equal((await call(worker,'/auth/challenges','POST',{contact:'real@outside.test',purpose:'verify'})).status,503);
});
test('phone linking cannot steal an identity or replace the existing number; email never opens phone guard',async()=>{
 await verified(owner,'+84900000001');await verified(worker);
 assert.equal((await call(worker,'/partners','POST',{kind:'shop',name:'DEMO'})).status,403);
 const c=await call(worker,'/auth/challenges','POST',{contact:'+84900000001',purpose:'verify'});
 // Owner's contact quota prevents immediate reuse across accounts.
 assert.equal(c.status,429);await f.pool.query("UPDATE auth_rate_events SET created_at=created_at-interval '61 seconds'");
 const d=await call(worker,'/auth/challenges','POST',{contact:'+84900000001',purpose:'verify'});
 assert.equal((await call(worker,'/auth/challenges/verify','POST',{challenge_id:d.body.id,code:await code(d.body.id)})).status,400);
 await verified(worker,'+84900000002');assert.equal((await call(worker,'/me')).body.phone_verified,true);
 assert.equal((await call(worker,'/auth/challenges','POST',{contact:'+84900000001',purpose:'verify'})).status,400);
});
test('invitation binds verified recipient, consumes once, scopes pagination and preserves membership ID after leaving',async()=>{
 const p=await partner(),i=await invite(p.id),key=randomUUID();
 assert.equal((await call(worker,'/invitations/accept','POST',{token:i.token})).status,404);
 await verified(worker);assert.equal((await call(outsider,'/invitations/accept','POST',{token:i.token})).status,404);
 const a=await call(worker,'/invitations/accept','POST',{token:i.token},key);assert.equal(a.status,200);assert.deepEqual(await call(worker,'/invitations/accept','POST',{token:i.token},key),a);
 const m=a.body;assert.equal((await call(worker,`/partners/${p.id}/invitations`)).status,404);assert.equal((await call(worker,'/me/memberships')).body.items[0].id,m.id);
 assert.equal((await call(outsider,`/memberships/${m.id}/departure-preview`)).status,404);
 assert.equal((await call(worker,`/memberships/${m.id}/leave`,'POST',{expected_version:m.version,reason:'DEMO leave'})).status,201);
 assert.equal((await call(worker,'/invitations/accept','POST',{token:i.token},key)).status,403);
 await f.pool.query("UPDATE member_invitations SET created_at=created_at-interval '61 seconds'");
 const n=await invite(p.id),accepted=await call(worker,'/invitations/accept','POST',{token:n.token});assert.equal(accepted.body.id,m.id);assert.deepEqual(accepted.body.permissions,[]);
 const list=await call(owner,`/partners/${p.id}/invitations?limit=1`);assert.equal(list.body.items.length,1);assert.ok(list.body.next_cursor);assert.ok(!JSON.stringify(list.body).includes(i.token));
 assert.equal((await call(owner,`/partners/${p.id}/invitations?status=pending&cursor=`+encodeURIComponent(list.body.next_cursor))).status,400);
});
test('resend replaces token, revoke races with acceptance, inviter grant is rechecked',async()=>{
 const p=await partner();await verified(worker);const i=await invite(p.id);
 assert.equal((await call(worker,'/invitations/accept','POST',{token:'0'.repeat(64)})).status,404);
 await f.pool.query("UPDATE member_invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[i.id]);
 assert.equal((await call(worker,'/invitations/accept','POST',{token:i.token})).status,409);
 await f.pool.query("UPDATE member_invitations SET created_at=created_at-interval '61 seconds'");
 const n=await call(owner,`/invitations/${i.id}/resend`,'POST',{expected_version:1});assert.equal(n.status,200,JSON.stringify(n));
 assert.equal((await call(worker,'/invitations/accept','POST',{token:i.token})).status,409);
 const token=await code(n.body.id,'invitation');const race=await Promise.all([call(worker,'/invitations/accept','POST',{token}),call(owner,`/invitations/${n.body.id}/revoke`,'POST',{expected_version:1,reason:'DEMO revoke'})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const mm=await joinTeam(p.id,manager);await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'members.manage',$2)",[mm.id,owner.id]);
 const invitation=await call(manager,`/partners/${p.id}/invitations`,'POST',{contact:outsider.email,permissions:[]});await verified(outsider);
 await f.pool.query('UPDATE membership_grants SET revoked_at=now() WHERE membership_id=$1',[mm.id]);
 assert.equal((await call(outsider,'/invitations/accept','POST',{token:await code(invitation.body.id,'invitation')})).status,403);
});
async function grant(a:Actor,id:string,version:number,permissions:string[],key=randomUUID()){
 const r=await call(a,'/auth/reauthenticate','POST',{password:'local team test password 2026'});assert.equal(r.status,200);const input={expected_version:version,permissions,reason:'DEMO grant',reauth_grant:r.body.grant};return {result:await call(a,`/memberships/${id}/grants`,'PUT',input,key),input,key};
}
test('grant changes require fresh single-use family grant, reason and bounded permissions; retry checks current access',async()=>{
 const p=await partner(),w=await joinTeam(p.id),m=await joinTeam(p.id,manager);
 const g=await grant(owner,m.id,m.version,['members.manage','jobs.assign']);assert.equal(g.result.status,200);
 assert.deepEqual(await call(owner,`/memberships/${m.id}/grants`,'PUT',g.input,g.key),g.result);
 assert.equal((await call(owner,`/memberships/${m.id}/grants`,'PUT',{...g.input,expected_version:g.result.body.version})).body.code,'REAUTH_REQUIRED');
 const denied=await grant(manager,w.id,w.version,['wallet.read']);assert.equal(denied.result.status,403);
 const allowed=await grant(manager,w.id,w.version,['jobs.assign']);assert.equal(allowed.result.status,200);
 const ownerId=(await call(owner,'/me/memberships')).body.items[0].id;
 assert.equal((await grant(owner,ownerId,1,[])).result.status,403);
 assert.equal((await call(owner,`/memberships/${w.id}/grants`,'PUT',{...g.input,permissions:['admin.users']})).status,400);
 await f.pool.query('UPDATE membership_grants SET revoked_at=now() WHERE membership_id=$1',[m.id]);
 assert.equal((await call(manager,`/memberships/${w.id}/grants`,'PUT',allowed.input,allowed.key)).status,404);
 const audit=(await f.pool.query("SELECT details FROM audit_events WHERE action='membership.grants'")).rows;assert.equal(audit.length,2);
 assert.ok(!JSON.stringify((await f.pool.query('SELECT * FROM idempotency_keys')).rows).includes(g.input.reauth_grant));
 assert.equal((await call(owner,'/auth/reauthenticate','POST',{password:'incorrect'})).body.code,'REAUTH_REQUIRED');
});
test('departure resets call contact and unassigns work, discards only unsent drafts and preserves private chat',async()=>{
 const p=await partner(),m=await joinTeam(p.id),customer=outsider;await verified(customer,'+84900000002');
 const job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode,state) VALUES($1,$2,'at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now','accepted') RETURNING id,version",[customer.id,p.id,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105}})])).rows[0];
 await f.pool.query('INSERT INTO job_skills(job_id,skill_id,name_snapshot,schema_version,answers) VALUES($1,$2,$3,1,$4)',[job.id,stableId('socket_replacement'),'DEMO','{}']);
 const assigned=await call(owner,`/jobs/${job.id}/assignments`,'POST',{expected_version:job.version,membership_id:m.id});assert.equal(assigned.status,201);
 const chat=assigned.body.conversation_id;assert.equal((await call(owner,`/conversations/${chat}/messages`)).status,404);
 const i=(await f.pool.query('INSERT INTO invoices(job_id) VALUES($1) RETURNING id',[job.id])).rows[0];
 const sent=(await f.pool.query("INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials,sent_at) VALUES($1,1,$2,100,0,now()) RETURNING id",[i.id,worker.id])).rows[0];
 const draft=(await f.pool.query('INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials) VALUES($1,2,$2,200,0) RETURNING id',[i.id,worker.id])).rows[0];
 await f.pool.query('UPDATE invoices SET current_version_id=$2 WHERE id=$1',[i.id,draft.id]);
 let contact=(await call(owner,`/partners/${p.id}/call-contact`)).body;
 assert.equal((await call(owner,`/partners/${p.id}/call-contact`,'PUT',{expected_version:contact.version,membership_id:m.id})).status,200);
 const preview=await call(worker,`/memberships/${m.id}/departure-preview`);assert.equal(preview.body.total,1);
 const result=await call(owner,`/memberships/${m.id}/deactivate`,'POST',{expected_version:m.version,reason:'DEMO handover'});assert.equal(result.status,201,JSON.stringify(result));
 assert.equal((await call(worker,`/jobs/${job.id}`)).status,404);assert.equal((await call(worker,`/conversations/${chat}/messages`)).status,200);
 contact=(await call(owner,`/partners/${p.id}/call-contact`)).body;assert.equal(contact.membership_id,null);
 const invoice=(await f.pool.query('SELECT * FROM invoices WHERE id=$1',[i.id])).rows[0];assert.equal(invoice.current_version_id,sent.id);assert.equal(invoice.state,'revision_requested');assert.equal((await f.pool.query('SELECT id FROM invoice_versions WHERE id=$1',[draft.id])).rowCount,0);
 assert.equal((await call(owner,`/jobs/${job.id}`)).body.assigned_member_id,null);
});
test('delivery queue retries unknown failures, survives restart and suppresses expired/replaced messages',async()=>{
 const c=await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'});let count=0;
 const settings={secret,contacts,mailpit:'http://127.0.0.1:1',smsDirectory:dir};
 const failed=new LocalMessages(f.pool,settings,async()=>{count++;throw new Error('timeout');});await failed.drain();
 assert.equal((await f.pool.query('SELECT state FROM local_deliveries')).rows[0].state,'unknown');
 await f.pool.query("UPDATE local_deliveries SET next_attempt_at=clock_timestamp()-interval '1 second'");
 const success=new LocalMessages(f.pool,settings,async()=>{count++;});const secondWorker=new LocalMessages(f.pool,settings,async()=>{count++;});await Promise.all([success.drain(),secondWorker.drain()]);assert.equal(count,2);
 const row=(await f.pool.query('SELECT * FROM local_deliveries')).rows[0];assert.equal(row.state,'submitted');assert.equal(row.payload_cipher,null);
 await f.pool.query("UPDATE auth_rate_events SET created_at=created_at-interval '61 seconds'");
 const expired=await call(worker,'/auth/challenges','POST',{contact:worker.email,purpose:'verify'});await f.pool.query('UPDATE auth_challenges SET invalidated_at=now() WHERE id=$1',[expired.body.id]);await success.drain();assert.equal(count,2);
 assert.equal((await f.pool.query('SELECT payload_cipher FROM local_deliveries WHERE challenge_id=$1',[expired.body.id])).rows[0].payload_cipher,null);
 assert.ok(!f.logs.text().includes(c.body.id));
});

test('reauth expiration and family revocation block grants without consuming another family',async()=>{
 const p=await partner(),m=await joinTeam(p.id);
 const input={expected_version:m.version,permissions:['jobs.assign'],reason:'DEMO',reauth_grant:''};
 let g=await call(owner,'/auth/reauthenticate','POST',{password:'local team test password 2026'});input.reauth_grant=g.body.grant;
 await f.pool.query("UPDATE reauth_grants SET expires_at=now()-interval '1 second'");
 assert.equal((await call(owner,`/memberships/${m.id}/grants`,'PUT',input)).body.code,'REAUTH_REQUIRED');
 g=await call(owner,'/auth/reauthenticate','POST',{password:'local team test password 2026'});input.reauth_grant=g.body.grant;
 const login=await call(null,'/auth/login','POST',{email:owner.email,password:'local team test password 2026'});
 assert.equal((await call({...owner,token:login.body.access_token},`/memberships/${m.id}/grants`,'PUT',input)).body.code,'REAUTH_REQUIRED');
 await call(owner,'/auth/logout','POST',{refresh_token:owner.refresh});
 assert.equal((await call(owner,`/memberships/${m.id}/grants`,'PUT',input)).status,401);
 assert.equal((await f.pool.query('SELECT consumed_at FROM reauth_grants WHERE grant_hash=$1',[secrets.hash(input.reauth_grant)])).rows[0].consumed_at,null);
 assert.equal((await f.pool.query('SELECT count(*) FROM membership_grants WHERE membership_id=$1',[m.id])).rows[0].count,'0');
 await assert.rejects(f.pool.query("UPDATE audit_events SET reason='tamper'"));
});
test('departure preserves locked and settled invoices and historical assignee while discarding draft-only invoices',async()=>{
 const p=await partner(),m=await joinTeam(p.id),jobs:string[]=[],invoices:string[]=[];
 for(const state of ['draft','locked','settled']){
  const j=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode,state) VALUES($1,$2,'at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now','accepted') RETURNING id",[outsider.id,p.id,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105}})])).rows[0];jobs.push(j.id);
  await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[j.id,p.id,m.id,owner.id]);
  const i=(await f.pool.query('INSERT INTO invoices(job_id) VALUES($1) RETURNING id',[j.id])).rows[0];invoices.push(i.id);
  const v=(await f.pool.query("INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials,sent_at) VALUES($1,1,$2,100,0,CASE WHEN $3='draft' THEN NULL ELSE now() END) RETURNING id",[i.id,worker.id,state])).rows[0];
  await f.pool.query("UPDATE invoices SET current_version_id=$2::uuid,state=$3::text,locked_version_id=CASE WHEN $3::text='draft' THEN NULL ELSE $2::uuid END,worker_receipt_confirmed_at=CASE WHEN $3='settled' THEN now() END,worker_receipt_by=CASE WHEN $3='settled' THEN $4::uuid END WHERE id=$1",[i.id,v.id,state,worker.id]);
 }
 const before=(await f.pool.query("SELECT row_to_json(i) AS value FROM invoices i WHERE state IN ('locked','settled') ORDER BY id")).rows;
 assert.equal((await call(worker,`/memberships/${m.id}/departure-preview`)).body.total,2);
 const left=await call(worker,`/memberships/${m.id}/leave`,'POST',{expected_version:m.version,reason:'DEMO leave'});assert.equal(left.status,201);
 assert.deepEqual((await f.pool.query("SELECT row_to_json(i) AS value FROM invoices i WHERE state IN ('locked','settled') ORDER BY id")).rows,before);
 assert.equal((await f.pool.query('SELECT 1 FROM invoices WHERE id=$1',[invoices[0]])).rowCount,0);
 for(let n=0;n<jobs.length;n++)assert.equal((await f.pool.query('SELECT membership_id FROM assignments WHERE job_id=$1 AND ended_at IS NULL',[jobs[n]])).rowCount,n===2?1:0);
 assert.equal((await call(worker,`/jobs/${jobs[1]}`)).status,404);
});
