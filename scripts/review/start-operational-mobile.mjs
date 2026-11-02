import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn,spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {requireOperationalTarget} from '../data/operational-model.mjs';
const platform=process.argv[2];if(!['ios','android'].includes(platform))throw Error('Choose ios or android; start the existing simulator/emulator first.');
const api=parseEnv(await readFile('services/api/.env','utf8'));requireOperationalTarget(api);
const port=Number(api.PORT||3110),metro=8085;if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Invalid API port');
if(platform==='android'){const adb=resolve(process.env.ANDROID_HOME||homedir()+'/Library/Android/sdk','platform-tools/adb'),serial=process.env.ANDROID_SERIAL||'emulator-5554';for(const p of [port,metro]){const r=spawnSync(adb,['-s',serial,'reverse','tcp:'+p,'tcp:'+p],{stdio:'inherit'});if(r.status!==0)throw Error('Android forwarding failed; check emulator and ANDROID_SERIAL');}}
console.log(`Operational review: ${platform}, dvqb_local, API ${port}, Metro ${metro}`);
const p=spawn(process.execPath,['--dns-result-order=ipv4first',resolve('node_modules/expo/bin/cli'),'start','--dev-client','--localhost','--port',String(metro),'--'+platform],{cwd:resolve('apps/mobile'),env:{...process.env,EXPO_PUBLIC_API_URL:`http://127.0.0.1:${port}/v1`,EXPO_PUBLIC_AUTH_STORAGE_NAMESPACE:'operational-review',EXPO_NO_TELEMETRY:'1'},stdio:'inherit'});
p.once('error',e=>{console.error(e.message);process.exitCode=1;});p.once('exit',code=>{process.exitCode=code??1;});
