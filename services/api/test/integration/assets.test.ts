import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {databaseFixture} from '../helpers/database.js';
test('local image upload verifies bytes, rejects fake images, checks ACL and signed URL session revocation',async()=>{
 const f=await databaseFixture('test-secret-'.repeat(4),true);
 try{
 const call=async(token:string|null,path:string,method='GET',body?:unknown,key=randomUUID())=>{const r=await fetch(f.base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 const register=async(name:string)=>(await call(null,'/auth/register','POST',{email:name+'@example.test',display_name:name,password:'Asset test password 2026'})).body;
 const owner=await register('owner'),other=await register('other');
 const bytes=await sharp({create:{width:30,height:20,channels:3,background:'#2457D6'}}).png().toBuffer();
 const input={purpose:'result',mime:'image/png',bytes:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},key=randomUUID();
 const g=await call(owner.access_token,'/assets/upload-grants','POST',input,key);assert.equal(g.status,201);assert.deepEqual(await call(owner.access_token,'/assets/upload-grants','POST',input,key),g);
 assert.equal((await call(other.access_token,'/assets/'+g.body.asset_id)).status,404);
 assert.equal((await fetch(g.body.upload_url,{method:'PUT',headers:g.body.required_headers,body:Buffer.from('bad')})).status,400);
 assert.equal((await fetch(g.body.upload_url,{method:'PUT',headers:g.body.required_headers,body:bytes})).status,200);
 const r=await call(owner.access_token,'/assets/'+g.body.asset_id+'/complete','POST',{expected_version:1});assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(r.body.status,'ready');
 const image=await fetch(r.body.download_url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width,30);
 assert.equal((await fetch(r.body.download_url+'x')).status,404);
 const fake=await call(owner.access_token,'/assets/upload-grants','POST',{purpose:'result',mime:'image/png',bytes:3});await fetch(fake.body.upload_url,{method:'PUT',headers:fake.body.required_headers,body:Buffer.from('bad')});assert.equal((await call(owner.access_token,'/assets/'+fake.body.asset_id+'/complete','POST',{expected_version:1})).status,400);
 await call(owner.access_token,'/auth/logout','POST');assert.equal((await fetch(r.body.download_url)).status,404);
 }finally{await f.close();}
});
