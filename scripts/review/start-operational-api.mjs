// Foreground local lifecycle: Ctrl-C stops only the API/media children we started.
import {readFile,access} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireOperationalTarget} from '../data/operational-model.mjs';

export function operationalRuntime(fileEnv,parentEnv,calls){
 requireOperationalTarget(fileEnv);
 if(fileEnv.HOST!=='127.0.0.1')throw Error('Operational API must bind 127.0.0.1');
 const port=Number(fileEnv.PORT||3110);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid API port');
 const env={...parentEnv,...fileEnv};for(const key of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'])delete env[key];
 if(calls)Object.assign(env,{LIVEKIT_URL:'ws://127.0.0.1:7880',LIVEKIT_API_KEY:'devkey',LIVEKIT_API_SECRET:'secret'});
 return {env,port};
}
async function free(port){await new Promise((ok,no)=>{const s=createServer();s.once('error',()=>no(Error(`Port ${port} is in use. Stop its current local process before starting review:api.`)));s.listen(port,'127.0.0.1',()=>s.close(ok));});}
export async function start(args=process.argv.slice(2)){
 if(args.some(a=>a!=='--calls'))throw Error('Usage: npm run review:api -- [--calls]');
 const root=fileURLToPath(new URL('../../',import.meta.url)),calls=args.includes('--calls');
 const {env,port}=operationalRuntime(parseEnv(await readFile(resolve(root,'services/api/.env'),'utf8')),process.env,calls);
 await free(port);const children=new Set();let stopping=false;
 const stop=()=>{if(stopping)return;stopping=true;for(const p of children)p.kill('SIGTERM');};
 const launch=(command,argv,cwd)=>{const p=spawn(command,argv,{cwd,env,stdio:'inherit'});children.add(p);p.once('error',e=>{console.error(e.message);process.exitCode=1;stop();});p.once('exit',code=>{children.delete(p);if(!stopping){process.exitCode=code||1;stop();}});return p;};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{
  if(calls){
   await free(7880);await free(7881);
   const binary=resolve(process.env.LIVEKIT_BIN||resolve(root,'.local/p2/livekit/livekit/1.13.10/bin/livekit-server'));await access(binary);
   launch(binary,['--config',resolve(root,'infra/livekit-local.yaml')],root);
   let ready=false;for(let n=0;n<50&&!stopping;n++){try{const r=await fetch('http://127.0.0.1:7880/',{signal:globalThis.AbortSignal.timeout(300)});if(r.ok){ready=true;break;}}catch{/* Wait for our child listener. */}await new Promise(r=>setTimeout(r,100));}
   if(!ready)throw Error('Local LiveKit did not become ready');
  }
  if(stopping)throw Error('Local runtime stopped before API startup');
  launch(process.execPath,['--import','tsx','src/main.ts'],resolve(root,'services/api'));
  console.log(`Operational API: dvqb_local, http://127.0.0.1:${port}/v1; calls ${calls?'local 7880':'off'}. Ctrl-C stops this runtime. No migration or seed is run.`);
 }catch(e){stop();throw e;}
}
if(process.argv[1]===fileURLToPath(import.meta.url))start().catch(e=>{console.error(e.message);process.exitCode=1;});
