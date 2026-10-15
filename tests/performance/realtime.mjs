import {performance} from 'node:perf_hooks';
// Isolated single-instance transport load. UI latency is measured separately by web/native tests.
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {Writable} from 'node:stream';
import {io} from 'socket.io-client';
import {createApp} from '../../services/api/dist/src/bootstrap.js';
import {AuthService} from '../../services/api/dist/src/modules/auth/auth.service.js';
import {RealtimeGateway} from '../../services/api/dist/src/modules/realtime/realtime.gateway.js';
import {RealtimeWorker} from '../../services/api/dist/src/modules/realtime/realtime.worker.js';
import {AppLog} from '../../services/api/dist/src/logging/logger.js';
import {migrate} from '../../services/api/dist/src/database/migrate.js';
const url=process.env.TEST_DATABASE_URL??'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
if(new URL(url).pathname!=='/dvqb_test')throw Error('Isolated dvqb_test required');
const schema='rt_load_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url}),pool=new Pool({connectionString:url,options:'-c search_path='+schema+',public',max:10,statement_timeout:5000});
const sockets=[],latency=[],committed=new Map(),early=new Map();let app,created=false,sent=0,frames=0;
try{
 await admin.query('CREATE SCHEMA '+schema);created=true;await migrate(pool);
 app=await createApp({databaseUrl:url,cursorSecret:randomUUID().repeat(2),authSecret:randomUUID().repeat(2),realtimeEnabled:true,port:0,host:'127.0.0.1'},pool,new AppLog(new Writable({write(_c,_e,d){d();}}),'error','test'));await app.listen(0,'127.0.0.1');const origin=await app.getUrl();
 const actors=[];for(let i=0;i<10;i++)actors.push(await app.get(AuthService).register(`load${i}@example.test`,'DEMO load test password 2026','DEMO load '+i));
 for(const a of actors)for(let n=0;n<10;n++){
  const s=io(origin,{path:'/v1/realtime/socket.io',transports:['websocket'],auth:{token:a.access_token},reconnection:false});sockets.push(s);
  s.on('domain.event',e=>{if(e.type!=='conversation.message_created.v1')return;frames++;const id=e.data.message_id,now=performance.now();if(committed.has(id))latency.push(Math.max(0,now-committed.get(id)));else{const list=early.get(id)??[];list.push(now);early.set(id,list);}});
  await new Promise((res,rej)=>{s.once('connect',res);s.once('connect_error',rej);});
 }
 const [low,high]=[actors[0].user.id,actors[1].user.id].sort();const room=(await pool.query("INSERT INTO conversations(kind,user_low,user_high) VALUES('direct',$1,$2) RETURNING id",[low,high])).rows[0].id;
 const duration=Number(process.env.REALTIME_LOAD_SECONDS??300),start=performance.now();
 for(let n=0;n<duration*10;n++){
  const r=await fetch(origin+`/v1/conversations/${room}/messages`,{method:'POST',headers:{Authorization:'Bearer '+actors[0].access_token,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({client_message_id:randomUUID(),body:'DEMO load '+n})});if(r.status!==201)throw Error('HTTP '+r.status);
  const m=await r.json(),at=performance.now();committed.set(m.id,at);for(const t of early.get(m.id)??[])latency.push(Math.max(0,t-at));early.delete(m.id);sent++;
  await new Promise(r=>setTimeout(r,Math.max(0,start+(n+1)*100-performance.now())));
 }
 for(let i=0;i<100&&frames<sent*20;i++)await new Promise(r=>setTimeout(r,100));
 latency.sort((a,b)=>a-b);const result={scope:'one API instance, transport only; HTTP ACK (after commit) to receive, early frames clamped to zero',connections:sockets.length,duration_seconds:duration,actual_seconds:(performance.now()-start)/1000,sent,frames,expected_frames:sent*20,p95_ms:latency[Math.floor(latency.length*.95)],max_ms:latency.at(-1),gateway:app.get(RealtimeGateway).metrics,worker:app.get(RealtimeWorker).metrics};
 await mkdir('test-results/load',{recursive:true});await writeFile('test-results/load/realtime.json',JSON.stringify(result,null,2));console.log(result);
 if(frames!==sent*20||result.p95_ms>2000)throw Error('Realtime load target failed');
}finally{sockets.forEach(s=>s.disconnect());await app?.close();await pool.end();if(created)await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();}
