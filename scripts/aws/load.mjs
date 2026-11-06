// Read-only load probe. Run only against your own pilot; no auth or private data.
import { performance } from 'node:perf_hooks';
const origin=new URL(process.argv[2]??'');
if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/')throw Error('Use your HTTPS API origin');
const concurrency=Number(process.argv[3]??10),requests=Number(process.argv[4]??100);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>50||!Number.isInteger(requests)||requests<1||requests>1000)throw Error('Bounds: 1..50 workers and 1..1000 total requests');
let next=0,failed=0;const times=[];const started=performance.now();
await Promise.all(Array.from({length:concurrency},async()=>{
  while(next++<requests){const start=performance.now();try{const r=await fetch(new URL('/v1/categories',origin),{signal:globalThis.AbortSignal.timeout(15000)});await r.arrayBuffer();if(!r.ok)failed++;}catch{failed++;}times.push(performance.now()-start);}
}));
times.sort((a,b)=>a-b);
console.log(JSON.stringify({requests:times.length,concurrency,failed,p50_ms:times[Math.floor(times.length*.5)],p95_ms:times[Math.min(times.length-1,Math.floor(times.length*.95))],duration_seconds:(performance.now()-started)/1000},null,2));
if(failed)process.exitCode=1;
