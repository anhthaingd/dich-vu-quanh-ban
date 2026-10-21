import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {decodeJwt} from 'jose';
import {LiveKitMedia} from '../../src/integrations/livekit/livekit.adapter.js';
test('adapter fails closed on auto-created room policy, issues only microphone bound grants and deletes room',async()=>{
 let secure=false,creates=0,deletes=0;
 const server=createServer(async(req,res)=>{
  if(req.url==='/rtc/validate'){const c=decodeJwt(req.headers.authorization!.slice(7));assert.equal((c.video as {roomCreate:boolean}).roomCreate,false);res.statusCode=secure?404:200;res.end(secure?'requested room does not exist':'success');return;}
  let data='';for await(const chunk of req)data+=chunk;
  res.setHeader('Content-Type','application/json');
  if(req.url?.endsWith('/CreateRoom')){creates++;const input=JSON.parse(data);assert.equal(input.maxParticipants,2);res.end(JSON.stringify({name:input.name,sid:'RM_TEST'}));return;}
  if(req.url?.endsWith('/DeleteRoom')){deletes++;res.end('{}');return;}
  res.statusCode=500;res.end('{}');
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{const provider=new LiveKitMedia({url:`ws://127.0.0.1:${(server.address() as {port:number}).port}`,apiKey:'DEMO_KEY',apiSecret:'test-local-only-secret'.repeat(2)});await assert.rejects(provider.token('room-a','user-a'),/LIVEKIT_EXPLICIT_ROOMS_REQUIRED/);assert.equal(creates,0);secure=true;
  const a=await provider.token('room-a','user-a'),b=await provider.token('room-a','user-b');const claims=decodeJwt(a.token),other=decodeJwt(b.token);assert.equal(claims.sub,'user-a');assert.equal(other.sub,'user-b');assert.equal(Number(claims.exp)-Number(claims.nbf),30);assert.deepEqual(claims.video,{roomJoin:true,room:'room-a',roomCreate:false,canPublish:true,canPublishSources:['microphone'],canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false});await provider.close('room-a');assert.equal(deletes,1);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
