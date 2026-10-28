import assert from 'node:assert/strict';
import test, {mock} from 'node:test';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {AuthService} from '../../src/modules/auth/auth.service.js';
import {LocalMessages} from '../../src/integrations/local-messages.js';
const secret='p2-security-secret-'.repeat(3),password='test-password-long-enough',contacts=['a@example.test','b@example.test','new@example.test','unknown@example.test','+84900000001'];
const config={secret,contacts,mailpit:'http://127.0.0.1:1',smsDirectory:'/tmp/dvqb-p2-sms'};
test('invalid security proofs never allocate password hashing work',async()=>{
 const f=await setup();
 const derive=mock.method(crypto,'scrypt',()=>{throw new Error('Unexpected password hashing before proof');});
 syncBuiltinESMExports();
 try{
  const reset=await f.call('/auth/password/reset',{challenge_id:randomUUID(),code:'000000',new_password:'new-password-long-enough'});
  assert.equal(reset.status,400);
  const challenge=await (await f.call('/auth/security/challenges',{purpose:'reset',contact:contacts[0]})).json();
  const code=await f.code(challenge.id);
  const wrong=await f.call('/auth/password/reset',{challenge_id:challenge.id,code:code==='000000'?'000001':'000000',new_password:'new-password-long-enough'});
  assert.equal(wrong.status,400);
  await f.pool.query("UPDATE auth_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[challenge.id]);
  const expired=await f.call('/auth/password/reset',{challenge_id:challenge.id,code,new_password:'new-password-long-enough'});
  assert.equal(expired.status,400);
  const change=await f.call('/me/password',{password,new_password:'new-password-long-enough'});
  assert.equal(change.status,401);
  assert.equal(derive.mock.callCount(),0);
 }finally{derive.mock.restore();syncBuiltinESMExports();await f.close();}
});
async function setup(){const f=await databaseFixture(secret,false,config,false,{secret});const auth=f.app.get(AuthService),a=await auth.register(contacts[0],password,'A');await f.pool.query('UPDATE identities SET verified_at=now() WHERE user_id=$1',[a.user.id]);const call=(path:string,body?:unknown,token?:string,extra:Record<string,string>={})=>fetch(f.base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(token?{Authorization:'Bearer '+token}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});async function code(id:string){const d=(await f.pool.query('SELECT payload_cipher FROM local_deliveries WHERE challenge_id=$1',[id])).rows[0];const payload=JSON.parse(f.app.get(LocalMessages).secrets.decrypt(d.payload_cipher));return String(payload.text).match(/\b\d{6}\b/)![0];}return {...f,auth,a,call,code};}
test('purpose-bound OTP login anti-enumeration, attempts, expiry, replay and reset revocation',async()=>{
 const f=await setup();try{
 const unknown=await (await f.call('/auth/security/challenges',{purpose:'login',contact:contacts[3]})).json();assert.deepEqual(Object.keys(unknown).sort(),['expires_at','id','resend_after_seconds']);
 const challenge=await (await f.call('/auth/security/challenges',{purpose:'login',contact:contacts[0]})).json(),code=await f.code(challenge.id);
 assert.equal((await f.call('/auth/challenges/verify',{challenge_id:challenge.id,code},f.a.access_token)).status,400);
 assert.equal((await f.call('/auth/password/reset',{challenge_id:challenge.id,code,new_password:'changed-password-long-enough'})).status,400);
 assert.equal((await f.call('/auth/security/confirm',{purpose:'login',challenge_id:challenge.id,code:code==='000000'?'000001':'000000'})).status,400);
 assert.equal((await f.pool.query('SELECT attempts FROM auth_challenges WHERE id=$1',[challenge.id])).rows[0].attempts,1);
 const login=await (await f.call('/auth/security/confirm',{purpose:'login',challenge_id:challenge.id,code})).json();assert.equal(login.user.id,f.a.user.id);assert.equal((await f.call('/auth/security/confirm',{purpose:'login',challenge_id:challenge.id,code})).status,400);
 const reset=await (await f.call('/auth/security/challenges',{purpose:'reset',contact:contacts[0]})).json(),resetCode=await f.code(reset.id);
 await f.pool.query('UPDATE auth_challenges SET expires_at=now()-interval \'1 second\' WHERE id=$1',[reset.id]);assert.equal((await f.call('/auth/password/reset',{challenge_id:reset.id,code:resetCode,new_password:'changed-password-long-enough'})).status,400);
 await f.pool.query('UPDATE auth_challenges SET expires_at=now()+interval \'1 minute\' WHERE id=$1',[reset.id]);
 assert.equal((await f.call('/auth/password/reset',{challenge_id:reset.id,code:resetCode,new_password:'changed-password-long-enough'})).status,201);
 await assert.rejects(()=>f.auth.authenticate('Bearer '+f.a.access_token));await assert.rejects(()=>f.auth.refresh(login.refresh_token));await assert.rejects(()=>f.auth.login(contacts[0],password));assert.equal((await f.auth.login(contacts[0],'changed-password-long-enough')).user.id,f.a.user.id);
 const logs=f.logs.text();for(const secretValue of [code,resetCode,f.a.access_token,'changed-password-long-enough'])assert.ok(!logs.includes(secretValue));
 assert.equal((await f.pool.query("SELECT count(*)::int n FROM idempotency_keys WHERE response_snapshot::text LIKE '%code%' OR response_snapshot::text LIKE '%token%' OR response_snapshot::text LIKE '%password%'")).rows[0].n,0);
 }finally{await f.close();}
});
test('identity retains old contact until verification, rejects other family and concurrent claim, stale old contact cannot login',async()=>{
 const f=await setup();try{
 const b=await f.auth.register(contacts[1],password,'B'),other=await f.auth.login(contacts[0],password);
 const old=await (await f.call('/auth/security/challenges',{purpose:'login',contact:contacts[0]})).json(),oldCode=await f.code(old.id);
 const c=await (await f.call('/me/identity-change',{expected_version:1,kind:'email',new_contact:contacts[2],password},f.a.access_token)).json(),code=await f.code(c.id);
 assert.equal((await f.pool.query("SELECT subject FROM identities WHERE user_id=$1 AND provider='email'",[f.a.user.id])).rows[0].subject,contacts[0]);
 assert.equal((await f.call('/me/identity-change/confirm',{challenge_id:c.id,code},other.access_token)).status,400);
 await f.pool.query("UPDATE auth_rate_events SET created_at=now()-interval '2 minutes'");
 const race=await (await f.call('/me/identity-change',{expected_version:1,kind:'email',new_contact:contacts[2],password},b.access_token)).json(),raceCode=await f.code(race.id);
 const result=await Promise.all([f.call('/me/identity-change/confirm',{challenge_id:c.id,code},f.a.access_token),f.call('/me/identity-change/confirm',{challenge_id:race.id,code:raceCode},b.access_token)]);assert.deepEqual(result.map(x=>x.status).sort(),[201,409]);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM identities WHERE subject=$1',[contacts[2]])).rows[0].n,1);
 if(result[0].status===201)assert.equal((await f.call('/auth/security/confirm',{purpose:'login',challenge_id:old.id,code:oldCode})).status,400);
 }finally{await f.close();}
});
async function admin(f:Awaited<ReturnType<typeof setup>>){const a=await f.auth.register('admin@example.test',password,'Admin');await f.pool.query("INSERT INTO admin_grants(user_id,permission) VALUES($1,'accounts.manage')",[a.user.id]);await f.pool.query("INSERT INTO admin_factors(user_id,secret_cipher,enrollment_family,pending_until,enabled_at) SELECT $1,'test',family_id,now(),now() FROM sessions WHERE refresh_hash IS NOT NULL AND user_id=$1 LIMIT 1",[a.user.id]);const mfa='b'.repeat(64);const {createHash}=await import('node:crypto');await f.pool.query("INSERT INTO admin_sessions(user_id,family_id,token_hash,expires_at) SELECT $1,family_id,$2,now()+interval '10 minutes' FROM sessions WHERE user_id=$1 LIMIT 1",[a.user.id,createHash('sha256').update(mfa).digest('hex')]);return {token:a.access_token,headers:{'X-Admin-Session':mfa,'Idempotency-Key':randomUUID()}};}
test('receipt privacy, recovery approval is not login, applicant proof revokes all old sessions without restoring suspension',async()=>{
 const f=await setup();try{
 const preflight=await fetch(f.base+'/auth/recovery-reports',{method:'OPTIONS',headers:{Origin:'http://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-recovery-token'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers')??'',/x-recovery-token/i);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://localhost');
 const r=await (await f.call('/auth/recovery-reports',{contact_claim:contacts[0],reachable_contact:contacts[2],description:'PRIVATE_EVIDENCE_CANARY'})).json(),receipt={'X-Recovery-Token':r.receipt_token};
 assert.equal((await f.call('/auth/recovery-reports/'+r.id)).status,404);assert.equal((await f.call('/auth/recovery-reports/'+r.id,undefined,undefined,{'X-Recovery-Token':'a'.repeat(64)})).status,404);
 const view=await (await f.call('/auth/recovery-reports/'+r.id,undefined,undefined,receipt)).json();assert.ok(!JSON.stringify(view).includes('PRIVATE'));assert.ok(!JSON.stringify(view).includes(contacts[0]));
 assert.equal((await f.call('/auth/recovery-reports/'+r.id+'/challenge',{},undefined,receipt)).status,409);
 assert.equal((await f.call('/auth/recovery-reports/'+r.id+'/evidence',{evidence:'SECOND_EVIDENCE_CANARY'},undefined,receipt)).status,201);
 const adm=await admin(f);const detail=await (await f.call('/admin/recovery-reports/'+r.id,undefined,adm.token,adm.headers)).json();assert.ok(detail.evidence.includes('PRIVATE_EVIDENCE_CANARY'));assert.ok(detail.evidence.includes('SECOND_EVIDENCE_CANARY'));await f.pool.query("UPDATE users SET status='suspended' WHERE id=$1",[f.a.user.id]);
 const decision={decision:'approve',expected_version:2,reason:'checked DEMO evidence'};
 const approved=await f.call('/admin/recovery-reports/'+r.id+'/decision',decision,adm.token,adm.headers);assert.equal(approved.status,201);assert.equal((await f.call('/admin/recovery-reports/'+r.id+'/decision',decision,adm.token,adm.headers)).status,201);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM sessions WHERE user_id=$1',[f.a.user.id])).rows[0].n,1);
 const challenge=await (await f.call('/auth/recovery-reports/'+r.id+'/challenge',{},undefined,receipt)).json(),code=await f.code(challenge.id);
 const reset={purpose:'recovery',challenge_id:challenge.id,code,new_password:'recovered-password-long-enough'};
 assert.equal((await f.call('/auth/security/confirm',reset)).status,400);assert.equal((await f.call('/auth/security/confirm',reset,undefined,receipt)).status,200);
 await assert.rejects(()=>f.auth.refresh(f.a.refresh_token));assert.equal((await f.pool.query('SELECT status FROM users WHERE id=$1',[f.a.user.id])).rows[0].status,'suspended');
 const logged=await f.auth.login(contacts[2],'recovered-password-long-enough');assert.equal(logged.user.status,'suspended');assert.ok(!f.logs.text().includes(r.receipt_token));assert.ok(!f.logs.text().includes('PRIVATE_EVIDENCE_CANARY'));
 }finally{await f.close();}
});
test('deletion rechecks obligations at approval, point forfeiture balanced, history retained, credentials revoked',async()=>{
 const f=await setup();try{
 const adm=await admin(f);const row=await (await f.call('/me/deletion-request',{expected_version:1,reason:'Remove DEMO account',password,forfeit_points:true},f.a.access_token)).json();assert.ok(row.id);
 await f.pool.query("INSERT INTO reports(reporter_id,kind,subject,body) VALUES($1,'account','test','obligation introduced after preview')",[f.a.user.id]);
 const body={action:'approve',expected_version:1,reason:'verified obligations'};
 assert.equal((await f.call('/admin/account-deletions/'+row.id+'/decision',body,adm.token,adm.headers)).status,409);
 assert.equal((await f.pool.query('SELECT status FROM users WHERE id=$1',[f.a.user.id])).rows[0].status,'active');await f.pool.query("UPDATE reports SET state='closed'");
 const p=(await f.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit) VALUES($1,'POINT') RETURNING id",[f.a.user.id])).rows[0];await f.pool.query('UPDATE ledger_accounts SET balance=150 WHERE id=$1',[p.id]);
 assert.equal((await f.call('/admin/account-deletions/'+row.id+'/decision',body,adm.token,adm.headers)).status,201);
 const u=(await f.pool.query('SELECT * FROM users WHERE id=$1',[f.a.user.id])).rows[0];assert.equal(u.status,'anonymized');assert.equal((await f.pool.query('SELECT balance FROM ledger_accounts WHERE id=$1',[p.id])).rows[0].balance,'0');
 assert.equal((await f.pool.query("SELECT sum(delta)::text n FROM ledger_entries WHERE posting_code='account_deletion'")).rows[0].n,'0');assert.equal((await f.pool.query('SELECT count(*)::int n FROM reports WHERE reporter_id=$1',[f.a.user.id])).rows[0].n,1);await assert.rejects(()=>f.auth.authenticate('Bearer '+f.a.access_token));await assert.rejects(()=>f.auth.login(contacts[0],password));
 }finally{await f.close();}
});
test('server locale is per-account, version/idempotency protected and reloaded by fresh session',async()=>{
 const f=await setup();try{
 const b=await f.auth.register(contacts[1],password,'B'),key=randomUUID(),patch=(input:unknown,k=key)=>fetch(f.base+'/me',{method:'PATCH',headers:{Authorization:'Bearer '+f.a.access_token,'Content-Type':'application/json','Idempotency-Key':k},body:JSON.stringify(input)}),input={expected_version:1,locale:'ja'};
 const saved=await (await patch(input)).json();assert.equal(saved.locale,'ja');assert.equal(saved.version,2);assert.equal((await (await patch(input)).json()).locale,'ja');assert.equal((await patch({...input,locale:'en'})).status,409);assert.equal((await patch({...input,locale:'en'},randomUUID())).status,409);
 assert.equal((await f.auth.login(contacts[0],password)).user.locale,'ja');assert.equal((await f.auth.authenticate('Bearer '+b.access_token)).user.locale,'vi');assert.equal((await patch({expected_version:2,locale:'fr'},randomUUID())).status,400);
 }finally{await f.close();}
});
test('deletion waits for in-flight assignment membership lock and observes the committed job obligation',async()=>{
 const f=await setup(),db=await f.pool.connect();try{
 const adm=await admin(f),customer=await f.auth.register(contacts[1],password,'Customer');const p=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('company','DEMO assignment race') RETURNING id")).rows[0],m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) RETURNING id',[p.id,f.a.user.id])).rows[0];
 const request=await (await f.call('/me/deletion-request',{expected_version:1,reason:'Remove DEMO account',password,forfeit_points:false},f.a.access_token)).json();
 const j=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer','{}',ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now') RETURNING id",[customer.user.id,p.id])).rows[0];
 await db.query('BEGIN');await db.query('SELECT id FROM memberships WHERE id=$1 FOR SHARE',[m.id]);
 const decision=f.call('/admin/account-deletions/'+request.id+'/decision',{action:'approve',expected_version:1,reason:'test assignment race'},adm.token,adm.headers);
 let waiting=false;for(let n=0;n<100;n++){if((await f.pool.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'SELECT id FROM memberships WHERE user_id=%'")).rowCount){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}assert.ok(waiting,'approval must wait on membership before checking job obligations');
 await db.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[j.id,p.id,m.id,customer.user.id]);await db.query('COMMIT');
 const result=await decision;assert.equal(result.status,409);const details=await result.json();assert.ok(details.code);const check=(await f.pool.query('SELECT 1 FROM assignments WHERE membership_id=$1 AND ended_at IS NULL',[m.id])).rowCount;assert.equal(check,1);assert.equal((await f.pool.query('SELECT status FROM users WHERE id=$1',[f.a.user.id])).rows[0].status,'active');
 }finally{await db.query('ROLLBACK');db.release();await f.close();}
});
test('admin account queues paginate older pending cases with signed actor/domain/filter-bound cursors and no evidence leaks',async()=>{
 const f=await setup();try{
 const adm=await admin(f);await f.pool.query("INSERT INTO account_recoveries(user_id,request_hash,receipt_hash,contact_cipher,contact_hash,evidence_cipher,state) SELECT $1,'test-hash','test-'||n,'PRIVATE_CONTACT_CANARY','private-hash','PRIVATE_EVIDENCE_CANARY',CASE WHEN n>25 THEN 'rejected' ELSE 'pending' END FROM generate_series(1,27) n",[f.a.user.id]);
 const read=(path:string)=>f.call(path,undefined,adm.token,adm.headers);let cursor:string|null=null;const ids=new Set<string>();let pages=0;
 do{const response=await read('/admin/recovery-reports?limit=10&state=pending'+(cursor?'&cursor='+encodeURIComponent(cursor):''));assert.equal(response.status,200);const page=await response.json();for(const r of page.items){assert.equal(r.state,'pending');assert.ok(!ids.has(r.id));ids.add(r.id);}cursor=page.next_cursor;pages++;if(cursor){assert.equal((await read('/admin/account-deletions?state=pending&cursor='+encodeURIComponent(cursor))).status,400);assert.equal((await read('/admin/recovery-reports?state=all&cursor='+encodeURIComponent(cursor))).status,400);}assert.ok(!JSON.stringify(page).includes('PRIVATE'));}while(cursor);
 assert.equal(ids.size,25);assert.equal(pages,3);const all=await (await read('/admin/recovery-reports?limit=100&state=all')).json();assert.equal(all.items.length,27);
 }finally{await f.close();}
});

test('public recovery retry uses applicant-held receipt secret without storing it in snapshots or duplicating applications',async()=>{
 const f=await setup();try{const receipt='c'.repeat(64),headers={'X-Recovery-Token':receipt},body={contact_claim:contacts[0],reachable_contact:contacts[2],description:'DEMO retry evidence'};
 const [one,two]=await Promise.all([f.call('/auth/recovery-reports',body,undefined,headers),f.call('/auth/recovery-reports',body,undefined,headers)]);assert.equal(one.status,201);assert.equal(two.status,201);const saved=await one.json();assert.deepEqual(await two.json(),saved);assert.equal(saved.receipt_token,receipt);assert.equal((await f.pool.query('SELECT count(*)::int n FROM account_recoveries')).rows[0].n,1);assert.equal((await f.call('/auth/recovery-reports',{...body,description:'changed'},undefined,headers)).status,409);assert.ok(!f.logs.text().includes(receipt));assert.equal((await f.pool.query('SELECT count(*)::int n FROM idempotency_keys')).rows[0].n,0);
 }finally{await f.close();}
});

test('suspended support sessions can save locale without changing profile name or losing their restricted session',async()=>{
 const f=await setup();try{await f.pool.query("UPDATE users SET status='suspended' WHERE id=$1",[f.a.user.id]);const support=await f.auth.login(contacts[0],password),patch=(body:unknown)=>fetch(f.base+'/me',{method:'PATCH',headers:{Authorization:'Bearer '+support.access_token,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(body)});
 const response=await patch({expected_version:1,locale:'ja'});assert.equal(response.status,200);const saved=await response.json();assert.equal(saved.locale,'ja');assert.equal(saved.status,'suspended');assert.deepEqual(saved.partner_ids,[]);assert.deepEqual(saved.admin_permissions,[]);
 assert.equal((await patch({expected_version:2,display_name:'Forbidden name'})).status,401);assert.equal((await patch({expected_version:2,locale:'en',display_name:'Forbidden name'})).status,401);const me=await f.auth.authenticate('Bearer '+support.access_token,undefined,true);assert.equal(me.user.locale,'ja');assert.equal(me.user.display_name,'A');assert.equal(me.user.status,'suspended');await assert.rejects(()=>f.auth.authenticate('Bearer '+support.access_token));assert.equal((await f.call('/me',undefined,support.access_token)).status,200);
 }finally{await f.close();}
});
