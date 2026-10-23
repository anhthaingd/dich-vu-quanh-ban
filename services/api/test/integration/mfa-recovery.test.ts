import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
test('backup codes are one use, hashed, password protected and reset requires another fresh grant manager',async()=>{
 const f=await databaseFixture('mfa-recovery-auth-'.repeat(3),false,undefined,false,{secret:'DEMO recovery encryption-'.repeat(3)});
 const password='DEMO recovery password 2026';type User={token:string;id:string;mfa?:string};
 try{
 const call=async(u:User,path:string,body?:unknown,key=randomUUID())=>{const r=await fetch(f.base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+u.token,'Content-Type':'application/json','Idempotency-Key':key,...(u.mfa?{'X-Admin-Session':u.mfa}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 const user=async(permissions:string[])=>{const r=await fetch(f.base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:randomUUID()+'@example.test',password,display_name:'DEMO admin'})});const v=await r.json(),u:User={token:v.access_token,id:v.user.id};for(const p of permissions)await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[u.id,p]);const setup=await call(u,'/admin/auth/enrollment',{password}),verified=await call(u,'/admin/auth/enrollment/confirm',{password,code:totp(decode32(setup.body.secret),Math.floor(Date.now()/30000))});u.mfa=verified.body.token;return u;};
 const a=await user(['grant.manage','audit.read']),b=await user(['audit.read']);
 const codes=await call(b,'/admin/auth/backup-codes',{});assert.equal(codes.status,201,JSON.stringify(codes));assert.equal(codes.body.codes.length,10);
 assert.ok(!JSON.stringify((await f.pool.query('SELECT * FROM admin_backup_codes')).rows).includes(codes.body.codes[0]));
 assert.equal((await call(b,'/admin/auth/recover',{password:'incorrect',code:codes.body.codes[0]})).status,403);
 const duplicate=await Promise.all([call(b,'/admin/auth/recover',{password,code:codes.body.codes[0]}),call(b,'/admin/auth/recover',{password,code:codes.body.codes[0]})]);assert.deepEqual(duplicate.map(r=>r.status).sort(),[201,403]);
 assert.equal((await call(b,'/admin/audit')).status,403); // recovery revoked old admin sessions
 b.mfa=duplicate.find(r=>r.status===201)!.body.token;
 const renewed=await call(b,'/admin/auth/backup-codes',{});assert.equal(renewed.status,201);
 assert.equal((await call(b,'/admin/auth/recover',{password,code:codes.body.codes[1]})).status,403);
 const replacement=await call(b,'/admin/auth/replacement',{password});assert.equal(replacement.status,201,JSON.stringify(replacement));
 assert.equal((await call(b,'/admin/audit')).status,403);
 const confirm=await call(b,'/admin/auth/enrollment/confirm',{password,code:totp(decode32(replacement.body.secret),Math.floor(Date.now()/30000))});assert.equal(confirm.status,201);b.mfa=confirm.body.token;
 assert.equal((await call(b,`/admin/auth/users/${a.id}/reset`,{expected_version:1,reason:'DEMO identity checked'})).status,403);
 assert.equal((await call(a,`/admin/auth/users/${a.id}/reset`,{expected_version:1,reason:'self'})).status,403);
 await f.pool.query("UPDATE admin_sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",[a.id]);
 assert.equal((await call(a,`/admin/auth/users/${b.id}/reset`,{expected_version:1,reason:'DEMO identity checked'})).status,403);
 await f.pool.query('UPDATE admin_sessions SET verified_at=now() WHERE user_id=$1',[a.id]);
 const resetKey=randomUUID(),resetInput={expected_version:1,reason:'DEMO identity checked'},resetPath=`/admin/auth/users/${b.id}/reset`;
 const reset=await call(a,resetPath,resetInput,resetKey);assert.equal(reset.status,201,JSON.stringify(reset));
 assert.deepEqual(await call(a,resetPath,resetInput,resetKey),reset);assert.equal((await call(a,resetPath,{...resetInput,reason:'Different'},resetKey)).status,409);assert.equal((await call(a,resetPath,resetInput)).status,409);
 assert.equal((await call(b,'/admin/auth/status')).body.enrolled,false);assert.equal((await call(b,'/admin/audit')).status,403);
 assert.equal((await call(b,'/admin/auth/recover',{password,code:renewed.body.codes[0]})).status,403);
 assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action='admin.mfa.reset' AND resource_id=$1",[b.id])).rows[0].count,'1');
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
 const schema=(await f.pool.query('SELECT current_schema() AS name')).rows[0].name;
 const rescue=()=>promisify(execFile)(process.execPath,['../../scripts/ops/demo-mfa-rescue.mjs',schema,b.id]);
 await assert.rejects(rescue(),/last active DEMO admin/);
 await f.pool.query('UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1',[a.id]);
 assert.equal((await call(a,resetPath,resetInput,resetKey)).status,403);
 await assert.rejects(rescue(),/Missing audited DEMO/);
 await f.pool.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.demo.bootstrap',$1,'Local DEMO fixture','{}')",[b.id]);
 assert.equal(JSON.parse((await rescue()).stdout).state,'mfa_reset');
 assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action='admin.mfa.demo_rescue' AND resource_id=$1",[b.id])).rows[0].count,'1');
 const logs=f.logs.text();assert.ok(!logs.includes(codes.body.codes[0]));assert.ok(!logs.includes(renewed.body.codes[0]));
 // Failed guesses commit and lock out after ten attempts rather than rolling back the limiter.
 for(let i=0;i<12;i++)await call(b,'/admin/auth/recover',{password,code:'0'.repeat(32)});
 assert.equal((await call(b,'/admin/auth/recover',{password,code:'0'.repeat(32)})).status,429);
 }finally{await f.close();}
});
