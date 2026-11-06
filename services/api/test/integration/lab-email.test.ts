import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {LocalMessages,MessageSecrets} from '../../src/integrations/local-messages.js';
import {stableId} from '../../src/database/seed.js';

test('lab email OTP opens provider, hire and acceptance without verifying phone; revocation and ACLs still apply',async()=>{
 const secret='lab-email-test-only-'.repeat(3),emails=['owner@example.test','customer@example.test'];
 const f=await databaseFixture('auth-lab-test-only-'.repeat(3),false,{secret,contacts:emails,mailpit:'http://127.0.0.1:1',smsDirectory:''},false,undefined,{verificationPolicy:'email_lab'});
 await f.app.get(LocalMessages).onModuleDestroy();
 type Actor={token:string;id:string;email:string};
 const call=async(a:Actor|null,path:string,method='GET',body?:unknown)=>{
  const r=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...(a?{Authorization:`Bearer ${a.token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,body:await r.json()};
 };
 const verify=async(a:Actor)=>{
  const c=await call(a,'/auth/challenges','POST',{contact:a.email,purpose:'verify'});assert.equal(c.status,201);
  assert.equal((await call(a,'/auth/challenges','POST',{contact:a.email,purpose:'verify'})).status,429);
  const row=(await f.pool.query('SELECT payload_cipher FROM local_deliveries WHERE challenge_id=$1',[c.body.id])).rows[0];
  const code=JSON.parse(new MessageSecrets(secret).decrypt(row.payload_cipher)).text.match(/\d{6}/)[0];
  const input={challenge_id:c.body.id,code};
  assert.equal((await call(a,'/auth/challenges/verify','POST',input)).status,200);
  assert.equal((await call(a,'/auth/challenges/verify','POST',input)).status,400);
  const me=(await call(a,'/me')).body;assert.equal(me.verification_policy,'email_lab');assert.equal(me.email_verified,true);assert.equal(me.phone_verified,false);
 };
 try{
  const actors:Actor[]=[];
  for(const email of emails){const r=await call(null,'/auth/register','POST',{email,password:'lab test password 2026',display_name:'DEMO'});assert.equal(r.status,201);actors.push({email,id:r.body.user.id,token:r.body.access_token});}
  const [owner,customer]=actors;
  assert.equal((await call(owner,'/partners','POST',{kind:'solo',name:'DEMO lab'})).status,403);
  assert.equal((await call(owner,'/auth/challenges','POST',{contact:'+84900000001',purpose:'verify'})).status,503);
  await verify(owner);
  let r=await call(owner,'/partners','POST',{kind:'solo',name:'DEMO lab'});assert.equal(r.status,201);let p=r.body;
  const point={latitude:21.0285,longitude:105.8542},skill=stableId('socket_replacement');
  for(const [action,body] of Object.entries({skills:{skills:[{skill_id:skill,modes:['at_customer']}]},'service-areas':{areas:[{label:'DEMO',center:point,radius_m:5000}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}})){
   r=await call(owner,`/partners/${p.id}/${action}`,'PUT',{expected_version:p.version,...body});assert.equal(r.status,200,JSON.stringify(r));p=r.body;
  }
  const input={partner_id:p.id,skills:[{skill_id:skill,schema_version:1,answers:{}}],service_mode:'at_customer',address:{text:'DEMO address',point},time_mode:'now'};
  assert.equal((await call(customer,`/partners/${p.id}`)).body.can_hire,false);
  assert.equal((await call(customer,'/jobs','POST',input)).status,403);
  await verify(customer);
  assert.equal((await call(customer,`/partners/${p.id}`)).body.can_hire,true);
  assert.equal((await call(owner,'/jobs','POST',input)).status,403); // no self-hire
  r=await call(customer,'/jobs','POST',input);assert.equal(r.status,201,JSON.stringify(r));const job=r.body;
  const accept={expected_version:job.version,eta:new Date(Date.now()+3600000).toISOString()};
  await f.pool.query("UPDATE identities SET verified_at=NULL WHERE user_id=$1 AND provider='email'",[owner.id]);
  assert.equal((await call(owner,`/jobs/${job.id}/accept`,'POST',accept)).status,403);
  await f.pool.query("UPDATE auth_rate_events SET created_at=created_at-interval '61 seconds'");await verify(owner);
  r=await call(owner,`/jobs/${job.id}/accept`,'POST',accept);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.state,'accepted');
  assert.equal((await f.pool.query("SELECT count(*) FROM identities WHERE provider='phone' AND verified_at IS NOT NULL")).rows[0].count,'0');
  await f.pool.query("UPDATE identities SET verified_at=NULL WHERE user_id=$1 AND provider='email'",[customer.id]);
  assert.equal((await call(customer,`/partners/${p.id}`)).body.can_hire,false);
  assert.equal((await call(customer,'/jobs','POST',input)).status,403);
 }finally{await f.close();}
});
