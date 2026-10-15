import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {decodeJwt,SignJWT} from 'jose';
import {databaseFixture} from '../helpers/database.js';
import {RealtimeWorker} from '../../src/modules/realtime/realtime.worker.js';
import {RealtimeGateway} from '../../src/modules/realtime/realtime.gateway.js';
import {NotificationsWorker} from '../../src/modules/notifications/notifications.worker.js';
import {event} from '../../src/common/events/event.store.js';
let f:Awaited<ReturnType<typeof databaseFixture>>,sockets:Socket[]=[];
const secret='realtime isolated test secret '.repeat(3);
async function call(token:string,path:string,body?:unknown){const r=await fetch(f.base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
async function account(name:string){return (await call('','/auth/register',{email:name+'@example.test',password:'DEMO local password 2026',display_name:name})).body;}
const wait=(ms=50)=>new Promise(r=>setTimeout(r,ms));
async function connect(token:string,extra={}){const s=io(f.base.replace(/\/v1$/,''),{path:'/v1/realtime/socket.io',transports:['websocket'],auth:{token},reconnection:false,autoConnect:false,...extra});sockets.push(s);await new Promise<void>((res,rej)=>{s.once('connect',res);s.once('connect_error',rej);s.connect();});return s;}
async function room(a:Awaited<ReturnType<typeof account>>,b:Awaited<ReturnType<typeof account>>){const [low,high]=[a.user.id,b.user.id].sort();await f.pool.query("INSERT INTO conversations(kind,user_low,user_high) VALUES('direct',$1,$2)",[low,high]);const r=await call(a.access_token,'/conversations',{peer_user_id:b.user.id});assert.equal(r.status,201);return r.body.id as string;}
const drain=()=>f.app.get(RealtimeWorker).drain();
beforeEach(async()=>{f=await databaseFixture(secret,false,undefined,true);await f.app.get(RealtimeWorker).onModuleDestroy();await f.app.get(NotificationsWorker).onModuleDestroy();});
afterEach(async()=>{sockets.forEach(s=>s.disconnect());sockets=[];await f?.close();});
test('realtime authenticates, gates Origin and subscriptions, emits committed minimal events and read once',async()=>{
 const a=await account('a'),b=await account('b'),o=await account('outsider'),id=await room(a,b);
 await assert.rejects(connect('invalid'));await assert.rejects(connect(a.access_token,{extraHeaders:{Origin:'https://evil.example'}}));
 const sa=await connect(a.access_token,{extraHeaders:{Origin:'http://localhost'}}),sb=await connect(b.access_token),so=await connect(o.access_token);
 const packets:Record<string,unknown>[]=[];sb.on('domain.event',e=>packets.push(e));let leaked=0;so.on('domain.event',()=>leaked++);
 const ack=await sb.timeout(2000).emitWithAck('subscribe',{type:'conversation',id,request_id:randomUUID()});assert.equal(ack.ok,true);
 assert.equal((await so.timeout(2000).emitWithAck('subscribe',{type:'conversation',id,request_id:randomUUID()})).ok,false);
 assert.equal((await sb.timeout(2000).emitWithAck('subscribe',{type:'conversation',id,request_id:randomUUID(),user_id:a.user.id})).code,'VALIDATION');
 const sent=await call(a.access_token,`/conversations/${id}/messages`,{client_message_id:randomUUID(),body:'SECRET_BODY_CANARY'});assert.equal(sent.status,201);
 await drain();await f.app.get(NotificationsWorker).drain();await drain();await wait();
 assert.equal(packets.filter(e=>e.type==='conversation.message_created.v1').length,1);assert.equal(packets.filter(e=>e.type==='notification.created.v1').length,0);assert.equal(leaked,0);assert.ok(!JSON.stringify(packets).includes('SECRET_BODY_CANARY'));
 for(const e of packets){assert.match(String(e.correlation_id),/^[0-9a-f-]{36}$/);assert.ok(e.occurred_at);}
 // A non-chat notice still emits and reads exactly once.
 const n=(await f.pool.query("INSERT INTO notifications(user_id,event_key,kind,resource_ref) VALUES($1,'notice-test','job.requested','{}') RETURNING id",[b.user.id])).rows[0];
 const noticeDb=await f.pool.connect();try{await event(noticeDb,'notice:'+n.id,n.id,1,'notification.created.v1',{notification_id:n.id});}finally{noticeDb.release();}
 await drain();await wait();assert.equal(packets.filter(e=>e.type==='notification.created.v1').length,1);
 await call(b.access_token,`/me/notifications/${n.id}/read`,{});await call(b.access_token,`/me/notifications/${n.id}/read`,{});await drain();await wait();assert.equal(packets.filter(e=>e.type==='notification.read.v1').length,1);
 assert.equal((await f.pool.query('SELECT count(*) FROM outbox_events WHERE processed_at IS NOT NULL')).rows[0].count,'0');
 sa.disconnect();
});
test('realtime closes revoked/rotated sessions before HTTP returns; old tokens never reconnect',async()=>{
 const a=await account('a');
 const short=await new SignJWT(decodeJwt(a.access_token)).setProtectedHeader({alg:'HS256',typ:'JWT'}).setExpirationTime(Math.floor(Date.now()/1000)+2).sign(new TextEncoder().encode(secret));
 const expiring=await connect(short);await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('expiry did not disconnect')),3000);expiring.once('disconnect',()=>{clearTimeout(timer);resolve();});});await assert.rejects(connect(short));
 const s=await connect(a.access_token);let disconnected=false;s.on('disconnect',()=>{disconnected=true;});
 const rotated=await call('','/auth/refresh',{refresh_token:a.refresh_token});assert.equal(rotated.status,200);await wait();assert.ok(disconnected);await assert.rejects(connect(a.access_token));
 const fresh=await connect(rotated.body.access_token);await call(rotated.body.access_token,'/auth/logout',{});await wait();assert.equal(fresh.connected,false);await assert.rejects(connect(rotated.body.access_token));
});
test('realtime rollback has no delivery; retries retain event id and isolate poison; offline recovers via HTTP',async()=>{
 const a=await account('a'),b=await account('b'),id=await room(a,b),db=await f.pool.connect();
 try{await db.query('BEGIN');await event(db,'rollback',id,1,'conversation.read.v1',{conversation_id:id,user_id:a.user.id,last_sequence:1});await db.query('ROLLBACK');}finally{db.release();}
 assert.equal((await f.pool.query('SELECT count(*) FROM realtime_deliveries')).rows[0].count,'0');
 await call(a.access_token,`/conversations/${id}/messages`,{client_message_id:randomUUID(),body:'offline'});
 const g=f.app.get(RealtimeGateway),original=g.publish.bind(g);let failed=true;g.publish=async(...args)=>{if(failed){failed=false;throw new Error('injected');}return original(...args);};
 await drain();assert.equal((await f.pool.query('SELECT count(*) FROM realtime_deliveries WHERE processed_at IS NOT NULL')).rows[0].count,'1');
 await f.pool.query('UPDATE realtime_deliveries SET next_attempt_at=now()');await drain();g.publish=original;
 assert.equal((await f.pool.query('SELECT count(*) FROM realtime_deliveries WHERE processed_at IS NOT NULL')).rows[0].count,'2');
 await connect(b.access_token);const messages=await call(b.access_token,`/conversations/${id}/messages?after_sequence=0`);assert.equal(messages.body.items[0].body,'offline');
});
test('realtime rechecks ACL before emit and proactively revokes known subscriptions after membership removal',async()=>{
 const a=await account('a'),b=await account('b'),customer=await account('customer');
 const p=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('company','DEMO') RETURNING id")).rows[0];
 const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true) RETURNING id',[p.id,b.user.id])).rows[0];
 const c=(await f.pool.query("INSERT INTO conversations(kind,partner_id,customer_id) VALUES('partner',$1,$2) RETURNING id",[p.id,customer.user.id])).rows[0];
 const s=await connect(b.access_token);assert.equal((await s.timeout(2000).emitWithAck('subscribe',{type:'conversation',id:c.id,request_id:randomUUID()})).ok,true);
 let delivered=0,revoked=0;s.on('domain.event',()=>delivered++);s.on('access.revoked',()=>revoked++);
 const db=await f.pool.connect();try{await event(db,'acl',c.id,1,'conversation.read.v1',{conversation_id:c.id,user_id:customer.user.id,last_sequence:1});}finally{db.release();}
 const revoker=await f.pool.connect();let dispatch:Promise<void>|undefined;
 try{
  await revoker.query('BEGIN');const pid=(await revoker.query('SELECT pg_backend_pid() AS id')).rows[0].id;
  await revoker.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[p.id]);dispatch=drain();
  let blocked=false;for(let i=0;i<40;i++){blocked=(await f.pool.query('SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))) AS blocked',[pid])).rows[0].blocked;if(blocked)break;await wait(25);}assert.ok(blocked,'dispatch waits on the same ACL lock as membership removal');
  await revoker.query('UPDATE memberships SET active=false WHERE id=$1',[m.id]);await revoker.query('COMMIT');
 }finally{await revoker.query('ROLLBACK');revoker.release();}
 await dispatch;await f.app.get(RealtimeGateway).audit();await wait();assert.equal(delivered,0);assert.equal(revoked,1);void a;
});
test('realtime bounds connections and packet floods, and disconnects slow receivers without buffering private frames',async()=>{
 const a=await account('a'),b=await account('b'),id=await room(a,b);
 for(let i=0;i<10;i++)await connect(a.access_token);
 await assert.rejects(connect(a.access_token));
 const s=await connect(b.access_token);for(let i=0;i<41;i++)s.emit('unknown.packet');await wait();assert.equal(s.connected,false);
 const slow=await connect(b.access_token),g=f.app.get(RealtimeGateway);
 const internals=g as unknown as {connections:Map<string,{user:string;socket:import('socket.io').Socket}>};
 const c=[...internals.connections.values()].find(c=>c.user===b.user.id)!;
 Object.defineProperty(c.socket.conn.transport,'writable',{value:false,writable:true});
 await g.publish(b.user.id,{type:'conversation',id},{event_id:randomUUID(),type:'conversation.read.v1',aggregate_version:1,correlation_id:randomUUID(),occurred_at:new Date().toISOString(),data:{conversation_id:id,last_sequence:1,user_id:a.user.id}});
 await wait();assert.equal(slow.connected,false);assert.equal(g.metrics.slow,1);
});
test('realtime lease expiry and crash after enqueue retry the same event ID; poison never blocks other rows',async()=>{
 const a=await account('a'),b=await account('b'),id=await room(a,b),s=await connect(b.access_token),ids:string[]=[];s.on('domain.event',e=>ids.push(e.event_id));
 await call(a.access_token,`/conversations/${id}/messages`,{client_message_id:randomUUID(),body:'DEMO lease'});
 await f.pool.query("UPDATE realtime_deliveries SET lease_until=now()+interval '30 seconds'");await drain();assert.equal(ids.length,0);
 await f.pool.query("UPDATE realtime_deliveries SET lease_until=now()-interval '1 second'");
 await f.pool.query(`CREATE FUNCTION fail_dispatch_mark() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.processed_at IS NOT NULL AND NEW.user_id='${b.user.id}'::uuid THEN RAISE EXCEPTION 'test crash after emit'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_dispatch_mark BEFORE UPDATE ON realtime_deliveries FOR EACH ROW EXECUTE FUNCTION fail_dispatch_mark()`);
 await drain();await wait();assert.equal(ids.length,1);
 await f.pool.query('DROP TRIGGER fail_dispatch_mark ON realtime_deliveries; DROP FUNCTION fail_dispatch_mark(); UPDATE realtime_deliveries SET next_attempt_at=now()');await drain();await wait();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
 await call(a.access_token,`/conversations/${id}/messages`,{client_message_id:randomUUID(),body:'DEMO poison'});
 await f.pool.query('UPDATE realtime_deliveries SET attempts=7 WHERE processed_at IS NULL AND user_id=$1',[b.user.id]);
 const g=f.app.get(RealtimeGateway),publish=g.publish.bind(g);g.publish=async(user,...args)=>{if(user===b.user.id)throw Error('isolated poison');return publish(user,...args);};await drain();g.publish=publish;
 assert.equal((await f.pool.query('SELECT count(*) FROM realtime_deliveries WHERE failed_at IS NOT NULL')).rows[0].count,'1');assert.equal((await f.pool.query('SELECT count(*) FROM realtime_deliveries WHERE processed_at IS NOT NULL')).rows[0].count,'3');
});
