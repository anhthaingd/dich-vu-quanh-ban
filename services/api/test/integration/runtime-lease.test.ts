import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {databaseFixture} from '../helpers/database.js';
import {RuntimeLease} from '../../src/database/runtime-lease.js';
import {RealtimeWorker} from '../../src/modules/realtime/realtime.worker.js';
import {PushWorker} from '../../src/modules/notifications/push.worker.js';

test('singleton lease rejects a second owner, fences sockets and workers on database session loss, then allows replacement',async()=>{
 const f=await databaseFixture('lease-test-secret-'.repeat(3),false,undefined,true,undefined,{labRealtime:true});
 const lease=f.app.get(RuntimeLease),competitor=new RuntimeLease(f.pool,true);let socket:ReturnType<typeof io>|undefined;
 try{
  await assert.rejects(competitor.acquire(),/ALREADY_ACTIVE/);
  const r=await fetch(f.base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'lease@example.test',password:'DEMO singleton test password',display_name:'DEMO'})});const session=await r.json();
  socket=io(f.base.replace(/\/v1$/,''),{path:'/v1/realtime/socket.io',transports:['websocket'],auth:{token:session.access_token},reconnection:false,autoConnect:false});
  await new Promise<void>((resolve,reject)=>{socket!.once('connect',resolve);socket!.once('connect_error',reject);socket!.connect();});
  const key=(await f.pool.query("SELECT hashtextextended(current_schema()||':dvqb-realtime',0)::text AS key")).rows[0].key;
  const pid=(await f.pool.query("SELECT pid FROM pg_locks WHERE locktype='advisory' AND classid=(($1::bigint >> 32) & 4294967295)::oid AND objid=($1::bigint & 4294967295)::oid AND granted",[key])).rows[0].pid;
  await f.pool.query('SELECT pg_terminate_backend($1)',[pid]);
  for(let i=0;i<40&&lease.ready;i++)await new Promise(r=>setTimeout(r,25));assert.equal(lease.ready,false);
  for(let i=0;i<40&&socket.connected;i++)await new Promise(r=>setTimeout(r,25));assert.equal(socket.connected,false);
  assert.equal((await fetch(f.base+'/ready')).status,503);assert.equal((await fetch(f.base+'/health')).status,200);
  await assert.rejects(lease.check());await assert.rejects(f.app.get(RealtimeWorker).drain());
  let sent=false;const push=new PushWorker(f.pool,f.logs.log,{accessToken:'test'},async()=>{sent=true;return Response.json({});},lease);await assert.rejects(push.drain());assert.equal(sent,false);
  const replacement=new RuntimeLease(f.pool,true);await replacement.acquire();assert.equal(replacement.ready,true);await replacement.onModuleDestroy();assert.equal(lease.ready,false);
 }finally{socket?.disconnect();await competitor.onModuleDestroy();await f.close();}
});

test('singleton heartbeat timeout fails closed without reacquiring or releasing twice',async()=>{
 const {EventEmitter}=await import('node:events');
 let queries=0,releases=0,losses=0;
 const client=Object.assign(new EventEmitter(),{query:async()=>{queries++;if(queries===1)return {rows:[{acquired:true}]};return new Promise<never>(()=>{});},release:()=>{releases++;}});
 const lease=new RuntimeLease({connect:async()=>client} as unknown as import('pg').Pool,true);
 lease.onLoss(()=>{losses++;});await lease.acquire();await assert.rejects(lease.check());assert.equal(lease.ready,false);assert.equal(releases,1);assert.ok(losses>=1);
 await assert.rejects(lease.check());await lease.onModuleDestroy();assert.equal(releases,1);assert.equal(queries,2);
});
