// Regression for the 12/11/2026 lab outage (B00-31): one slow write held the actor/session locks,
// every other request of that user queued until statement_timeout, and the API was replaced.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {databaseFixture} from '../helpers/database.js';
import {AuthService} from '../../src/modules/auth/auth.service.js';
import {AssetsService} from '../../src/modules/assets/assets.service.js';

type Fixture=Awaited<ReturnType<typeof databaseFixture>>;
const caller=(f:Fixture)=>async(token:string|null,path:string,method='GET',body?:unknown)=>{
 const r=await fetch(f.base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json','Idempotency-Key':randomUUID()},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:r.status===204?null:await r.json().catch(()=>null)};
};
const pendingAfter=async(p:Promise<unknown>,ms:number)=>Promise.race([p.then(()=>false,()=>false),new Promise<boolean>(r=>setTimeout(()=>r(true),ms))]);

test('an open write transaction does not stall reads of the same session, but revocation still waits for it',async()=>{
 const f=await databaseFixture('request-locking-secret-'.repeat(3));
 const client=await f.pool.connect();let open=false;
 try{
  const call=caller(f);
  const session=(await call(null,'/auth/register','POST',{email:'lock@example.test',password:'DEMO locking password 2026',display_name:'DEMO'})).body;
  const token=session.access_token,sid=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sid;
  // Activity is written at most once a minute.
  await f.pool.query("UPDATE sessions SET last_seen_at=clock_timestamp()-interval '2 minutes' WHERE id=$1",[sid]);
  assert.equal((await call(token,'/me')).status,200);
  const touched=(await f.pool.query('SELECT last_seen_at FROM sessions WHERE id=$1',[sid])).rows[0].last_seen_at as Date;
  assert.ok(Date.now()-touched.getTime()<30_000);
  assert.equal((await call(token,'/me')).status,200);
  assert.equal(((await f.pool.query('SELECT last_seen_at FROM sessions WHERE id=$1',[sid])).rows[0].last_seen_at as Date).getTime(),touched.getTime());
  // A write transaction of this session authenticates inside its transaction and stays open.
  await client.query('BEGIN');open=true;
  await f.app.get(AuthService).authenticate('Bearer '+token,client);
  const started=Date.now(),read=await call(token,'/me');
  assert.equal(read.status,200);assert.ok(Date.now()-started<2000,'read waited for the open write');
  // Revoking the session must not overtake the in-flight write.
  const logout=call(token,'/auth/logout','POST');
  assert.equal(await pendingAfter(logout,500),true);
  await client.query('COMMIT');open=false;
  assert.ok([200,204].includes((await logout).status));
  assert.equal((await call(token,'/me')).status,401);
 }finally{if(open)await client.query('ROLLBACK');client.release();await f.close();}
});

test('image processing runs outside the account transaction',async()=>{
 const f=await databaseFixture('request-locking-secret-'.repeat(3),true);
 try{
  const call=caller(f);
  const session=(await call(null,'/auth/register','POST',{email:'asset@example.test',password:'DEMO locking password 2026',display_name:'DEMO'})).body;
  const token=session.access_token;
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#2457D6'}}).png().toBuffer();
  const grant=(await call(token,'/assets/upload-grants','POST',{purpose:'gallery',mime:'image/png',bytes:bytes.length})).body;
  await fetch(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:bytes});
  // Hold processing open, as a large photo on the 0.25 vCPU lab task did for seconds.
  const service=f.app.get(AssetsService) as unknown as {derive:(a:unknown)=>Promise<void>};
  const derive=service.derive.bind(service);let entered!:()=>void,release!:()=>void;
  const inside=new Promise<void>(r=>{entered=r;}),gate=new Promise<void>(r=>{release=r;});
  service.derive=async a=>{entered();await gate;return derive(a);};
  const complete=call(token,`/assets/${grant.asset_id}/complete`,'POST',{expected_version:1});
  await inside;
  // Another write of the same user (serialized per actor) completes while the image is processed.
  const started=Date.now(),edit=await call(token,'/me','PATCH',{expected_version:1,display_name:'DEMO edited'});
  assert.equal(edit.status,200,JSON.stringify(edit.body));assert.ok(Date.now()-started<2000,'write waited for image processing');
  release();
  const done=await complete;assert.equal(done.status,201,JSON.stringify(done.body));assert.equal(done.body.status,'ready');
  assert.equal((await f.pool.query('SELECT status FROM assets WHERE id=$1',[grant.asset_id])).rows[0].status,'ready');
 }finally{await f.close();}
});
