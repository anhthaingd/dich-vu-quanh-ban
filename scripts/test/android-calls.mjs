import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const run=promisify(execFile);
const sdk=process.env.ANDROID_HOME??path.join(process.env.HOME,'Library/Android/sdk');
const adb=path.join(sdk,'platform-tools/adb');
const serial=process.env.ANDROID_SERIAL??'emulator-5554';
if(!serial.startsWith('emulator-'))throw Error('This mock harness is restricted to an emulator.');
const command=(...args)=>run(adb,['-s',serial,...args],{maxBuffer:16*1024*1024,timeout:120000});
const output=path.resolve('test-results/android-calls');await fs.mkdir(output,{recursive:true});
let heartbeats=0,ended=0,denied=0;
const server=http.createServer((req,res)=>{
 const reply=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 if(req.headers.authorization!=='Bearer DEMO_NATIVE_TEST_ONLY'){denied++;return reply(401,{});}
 if(req.url.endsWith('/heartbeat')){heartbeats++;return reply(200,{state:'accepted',version:2});}
 if(req.url.endsWith('/actions')){ended++;return reply(200,{state:'ended',version:3});}
 reply(404,{});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4317,'127.0.0.1',resolve);});
try {
 await command('install','--no-streaming','-r','apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk');
 await command('install','--no-streaming','-r','apps/mobile/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk');
 await command('shell','pm','grant','vn.dichvuquanhban.app','android.permission.RECORD_AUDIO');
 await command('shell','pm','grant','vn.dichvuquanhban.app','android.permission.POST_NOTIFICATIONS');
 const task=command('shell','am','instrument','-w','vn.dichvuquanhban.app.test/vn.dichvuquanhban.calls.CallInstrumentation');
 let observed='',capture=false,home=false;const actions=[];
 task.child.stdout.on('data',chunk=>{
  observed+=chunk.toString();
  if(!capture&&observed.includes('CAPTURE_INCOMING')){capture=true;actions.push(run(adb,['-s',serial,'exec-out','screencap','-p'],{encoding:'buffer',maxBuffer:16*1024*1024}).then(image=>fs.writeFile(path.join(output,'android-call-incoming.png'),image.stdout)));}
  if(!home&&observed.includes('GO_HOME')){home=true;actions.push(command('shell','input','keyevent','KEYCODE_HOME'));}
 });
 const {stdout}=await task;await Promise.all(actions);
 if(!stdout.includes('PASS:')||stdout.includes('FAIL:')||heartbeats<3||ended!==1||denied<2||!home||!capture)throw Error('Native call test failed: '+stdout+JSON.stringify({heartbeats,ended,denied}));
 const evidence={checkedAt:new Date().toISOString(),platform:'Android emulator',serial,heartbeats,ended,denied,result:stdout,limits:'Native UI/service with injected push payload and mock HTTP. No LiveKit audio, actual FCM, physical device, release, or AWS proof.'};
 await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence,null,2));
}finally{await new Promise(resolve=>server.close(resolve));}
