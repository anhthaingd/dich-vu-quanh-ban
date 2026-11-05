import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {LocalMessages} from '../../src/integrations/local-messages.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
const password='DEMO invitation password 2026',email='invite-admin@example.test';
type User={token:string;id:string;mfa?:string};
async function call(u:User|undefined,path:string,body?:unknown,key=randomUUID()){const r=await fetch(f.base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,...(u?{Authorization:'Bearer '+u.token}:{}),...(u?.mfa?{'X-Admin-Session':u.mfa}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};}
async function user(address=randomUUID()+'@example.test',permissions:string[]=[]){const r=await call(undefined,'/auth/register',{email:address,password,display_name:'DEMO invitation user'});assert.equal(r.status,201);const u:User={token:r.body.access_token,id:r.body.user.id};for(const p of permissions)await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[u.id,p]);if(permissions.length){const s=await call(u,'/admin/auth/enrollment',{password}),v=await call(u,'/admin/auth/enrollment/confirm',{password,code:totp(decode32(s.body.secret),Math.floor(Date.now()/30000))});assert.equal(v.status,201);u.mfa=v.body.token;}return u;}
const input={name:'DEMO recipient',email,permissions:['support.read'],reason:'DEMO support staffing'};
async function secret(id:string){const r=(await f.pool.query('SELECT payload_cipher FROM local_deliveries WHERE admin_invitation_id=$1',[id])).rows[0];return JSON.parse(f.app.get(LocalMessages).secrets.decrypt(r.payload_cipher)).text.match(/[a-f0-9]{64}/)[0] as string;}
beforeEach(async()=>{f=await databaseFixture('invite-auth-secret-'.repeat(3),false,{secret:'invite-message-'.repeat(4),mailpit:'http://127.0.0.1:1',smsDirectory:'/tmp/dvqb-invite-test',contacts:[email]},false,{secret:'invite-admin-'.repeat(4)});});
afterEach(async()=>{await f.close();});
test('admin invitation needs live fresh authority and verified recipient; lost responses grant once and still require MFA',async()=>{
 const a=await user(undefined,['grant.manage','support.read']),ordinary=await user();
 assert.equal((await call(ordinary,'/admin/invitations',input)).status,403);
 assert.equal((await call({...a,mfa:undefined},'/admin/invitations',input)).status,403);
 assert.equal((await call(a,'/admin/invitations',{...input,permissions:['finance.review']})).status,403);
 const key=randomUUID(),created=await call(a,'/admin/invitations',input,key);assert.equal(created.status,201);
 assert.deepEqual((await call(a,'/admin/invitations',input,key)).body,created.body);assert.equal((await call(a,'/admin/invitations',input)).status,409);
 const token=await secret(created.body.id);assert.ok(!JSON.stringify(created.body).includes(token));assert.equal(created.body.contact_masked,'i***@example.test');
 const recipient=await user(email);assert.equal((await call(recipient,'/admin-invitations/preview',{token})).status,404);assert.equal((await call(ordinary,'/admin-invitations/accept',{token})).status,404);
 await f.pool.query("UPDATE identities SET verified_at=now() WHERE user_id=$1 AND provider='email'",[recipient.id]);
 assert.deepEqual((await call(recipient,'/admin-invitations/preview',{token})).body.permissions,['support.read']);
 assert.equal((await f.pool.query('SELECT count(*) FROM admin_grants WHERE user_id=$1',[recipient.id])).rows[0].count,'0');
 const acceptKey=randomUUID(),result=await call(recipient,'/admin-invitations/accept',{token},acceptKey);assert.equal(result.status,201);assert.equal(result.body.requires_mfa,true);
 assert.deepEqual((await call(recipient,'/admin-invitations/accept',{token},acceptKey)).body,result.body);assert.equal((await call(recipient,'/admin-invitations/accept',{token})).status,409);
 assert.equal((await f.pool.query('SELECT count(*) FROM admin_grants WHERE user_id=$1',[recipient.id])).rows[0].count,'1');assert.equal((await call(recipient,'/admin/reports')).status,403);
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND permission='grant.manage'",[a.id]);assert.equal((await call(recipient,'/admin-invitations/accept',{token},acceptKey)).status,403);
});
test('resend replaces token, revoke and expiry block acceptance, and authority is rechecked at use',async()=>{
 const a=await user(undefined,['grant.manage','support.read']),first=await call(a,'/admin/invitations',input),old=await secret(first.body.id);
 const recipient=await user(email);await f.pool.query('UPDATE identities SET verified_at=now() WHERE user_id=$1',[recipient.id]);
 await f.pool.query("UPDATE admin_invitations SET created_at=created_at-interval '2 minutes' WHERE id=$1",[first.body.id]);
 const second=await call(a,'/admin/invitations/'+first.body.id+'/resend',{expected_version:1,reason:'DEMO resend'});assert.equal(second.status,201);const current=await secret(second.body.id);
 assert.notEqual(old,current);assert.equal((await call(recipient,'/admin-invitations/accept',{token:old})).status,409);
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND permission='support.read'",[a.id]);assert.equal((await call(recipient,'/admin-invitations/preview',{token:current})).status,403);await f.pool.query("UPDATE admin_grants SET revoked_at=NULL WHERE user_id=$1 AND permission='support.read'",[a.id]);
 await f.pool.query("UPDATE admin_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[second.body.id]);assert.equal((await call(recipient,'/admin-invitations/accept',{token:current})).status,409);
 const revoked=await call(a,'/admin/invitations/'+second.body.id+'/revoke',{expected_version:1,reason:'DEMO revoke'});assert.equal(revoked.status,201);assert.equal(revoked.body.status,'revoked');assert.equal((await call(recipient,'/admin-invitations/preview',{token:current})).status,409);
 assert.equal((await f.pool.query('SELECT count(*) FROM admin_grants WHERE user_id=$1',[recipient.id])).rows[0].count,'0');
});
test('grant directory separates admins and candidates and searches email without returning it in full',async()=>{
 const a=await user(undefined,['grant.manage','support.read']),b=await user(email);
 const candidates=await call(a,'/admin/grant-users?role=candidates&q='+encodeURIComponent(email));assert.equal(candidates.status,200);assert.equal(candidates.body.items[0].id,b.id);assert.equal(candidates.body.items[0].email_masked,'i***@example.test');assert.ok(!JSON.stringify(candidates.body).includes(email));
 const admins=await call(a,'/admin/grant-users?role=admins');assert.deepEqual(admins.body.items.map((x:{id:string})=>x.id),[a.id]);
 assert.equal((await call(a,'/admin/invitations',input)).body.code,'ACCOUNT_EXISTS');
});
test('support overview counts the full period and queue pagination binds dates, sort and completion filters',async()=>{
 const a=await user(undefined,['support.read']),other=await user(undefined,['reports.read']),reporter=await user();
 const ids:string[]=[];
 for(const [i,state] of ['open','open','reviewing','resolved','closed','open'].entries()){
  const r=await call(reporter,'/reports',{subject:'DEMO overview '+i,body:'DEMO test support',kind:'account',evidence_ids:[]});assert.equal(r.status,201);ids.push(r.body.id);
  await f.pool.query('UPDATE reports SET state=$2,created_at=$3 WHERE id=$1',[r.body.id,state,i===5?'2026-10-01T00:00:00Z':`2026-11-0${i+1}T12:00:00Z`]);
 }
 const dates='from=2026-11-01T00:00:00Z&to=2026-11-06T00:00:00Z';
 assert.equal((await call(other,'/admin/reports-summary?'+dates)).status,403);
 const summary=await call(a,'/admin/reports-summary?'+dates);assert.equal(summary.status,200);assert.deepEqual(summary.body.counts,{open:'2',reviewing:'1',awaiting_evidence:'0',resolved:'1',closed:'1'});
 const first=await call(a,'/admin/reports?'+dates+'&sort=oldest&limit=2');assert.deepEqual(first.body.items.map((r:{id:string})=>r.id),ids.slice(0,2));assert.ok(first.body.next_cursor);
 const next=await call(a,'/admin/reports?'+dates+'&sort=oldest&limit=2&cursor='+encodeURIComponent(first.body.next_cursor));assert.deepEqual(next.body.items.map((r:{id:string})=>r.id),ids.slice(2,4));
 assert.equal((await call(a,'/admin/reports?'+dates+'&sort=newest&cursor='+encodeURIComponent(first.body.next_cursor))).status,400);
 const done=await call(a,'/admin/reports?'+dates+'&state=done');assert.deepEqual(done.body.items.map((r:{id:string})=>r.id),[ids[4],ids[3]]);
 assert.equal((await call(a,'/admin/reports-summary?from=2026-11-07&to=2026-11-01')).status,400);
});
