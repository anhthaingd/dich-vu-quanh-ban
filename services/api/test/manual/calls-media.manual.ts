import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import type {Room,LocalAudioTrack,RemoteAudioTrack,RemoteTrack} from 'livekit-client';
type MediaWindow=Window & {LivekitClient:typeof import('livekit-client');media:{room:Room;audio:AudioContext;osc:OscillatorNode;gain:GainNode;remote:RemoteAudioTrack|null;analyser:AnalyserNode|null;local:LocalAudioTrack|null;disconnected:boolean;refreshed?:string}};
import {databaseFixture} from '../helpers/database.js';
import {stableId} from '../../src/database/seed.js';
// Opt-in actual local SFU/browser audio test. Distinct generated tones are test
// signals, not a claim that a human microphone or physical phone was tested.
test('local LiveKit carries distinct decoded audio each way, mute and server end/logout disconnect both browsers',{timeout:90000},async()=>{
 const f=await databaseFixture('browser-calls-local-secret'.repeat(3),false,undefined,false,undefined,{calls:{url:process.env.LIVEKIT_TEST_URL!,apiKey:'devkey',apiSecret:'secret'}});
 const sdk=await readFile(new URL('../../../../node_modules/livekit-client/dist/livekit-client.umd.js',import.meta.url));
 const server=createServer((req,res)=>{if(req.url==='/sdk.js'){res.setHeader('Content-Type','application/javascript');res.end(sdk);}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><h1>DEMO local two-way generated audio</h1><script src="/sdk.js"></script></body></html>');}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  browser=await chromium.launch({executablePath:chromium.executablePath(),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  type A={id:string;token:string};
  const api=async(a:A|null,path:string,body?:unknown)=>{const r=await fetch(f.base+path,{method:body===undefined?'GET':'POST',headers:{...(a?{Authorization:'Bearer '+a.token}:{}),'Content-Type':'application/json','Idempotency-Key':randomUUID()},...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await r.json();assert.ok(r.ok,JSON.stringify({path,status:r.status,value}));return value;};
  const account=async(name:string)=>{const s=await api(null,'/auth/register',{email:name+'@example.test',password:'DEMO browser media test password',display_name:name});await f.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[s.user.id,'+849'+String(Math.random()).slice(2,10)]);return {id:s.user.id,token:s.access_token};};
  const owner=await account('audio-owner'),customer=await account('audio-customer');
  const p=await api(owner,'/partners',{kind:'solo',name:'DEMO media provider'});const membership=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1',[p.id])).rows[0];
  await f.pool.query("UPDATE partners SET publication_status='published' WHERE id=$1",[p.id]);
  const j=(await f.pool.query(`INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode,state) VALUES($1,$2,'at_customer','{}',ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now','accepted') RETURNING id`,[customer.id,p.id])).rows[0];
  await f.pool.query('INSERT INTO job_skills(job_id,skill_id,name_snapshot,schema_version,answers) VALUES($1,$2,$3,1,$4)',[j.id,stableId('socket_replacement'),'DEMO socket','{}']);
  await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[j.id,p.id,membership.id,owner.id]);
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const pages=await Promise.all(contexts.map(c=>c.newPage()));await Promise.all(pages.map(p=>p.goto(origin)));
  const summary:unknown[]=[];
  for(const reason of ['end','logout'] as const){
   const c=await api(customer,'/calls',{job_id:j.id,target:'worker'});const accepted=await api(owner,`/calls/${c.id}/actions`,{action:'accept',expected_version:c.version});
   const tokens=await Promise.all([api(customer,`/calls/${c.id}/media`,{}),api(owner,`/calls/${c.id}/media`,{})]);
   await Promise.all(pages.map((page,i)=>page.evaluate(async({credentials,hz})=>{
    const w=window as unknown as MediaWindow,L=w.LivekitClient;const audio=new AudioContext();await audio.resume();const osc=audio.createOscillator();osc.frequency.value=hz;const gain=audio.createGain();gain.gain.value=.25;const dest=audio.createMediaStreamDestination();osc.connect(gain);gain.connect(dest);osc.start();
    const room=new L.Room();w.media={room,audio,osc,gain,remote:null,analyser:null,local:null,disconnected:false};
    room.engine.on('tokenRefreshed',(token:string)=>{w.media.refreshed=token;});room.on(L.RoomEvent.Disconnected,()=>{w.media.disconnected=true;});
    room.on(L.RoomEvent.TrackSubscribed,(track:RemoteTrack)=>{if(track.kind!=='audio')return;w.media.remote=track as RemoteAudioTrack;const element=track.attach();element.autoplay=true;document.body.appendChild(element);void element.play();const source=audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));const analyser=audio.createAnalyser();analyser.fftSize=4096;source.connect(analyser);const silent=audio.createGain();silent.gain.value=0;analyser.connect(silent);silent.connect(audio.destination);w.media.analyser=analyser;});
    await room.connect(credentials.url,credentials.token);const local=new L.LocalAudioTrack(dest.stream.getAudioTracks()[0]);w.media.local=local;await room.localParticipant.publishTrack(local,{source:L.Track.Source.Microphone});
   },{credentials:tokens[i],hz:i?880:440})));
   try{await Promise.all(pages.map(p=>p.waitForFunction(()=>{const m=(window as unknown as MediaWindow).media;if(!m.analyser)return false;const v=new Float32Array(m.analyser!.frequencyBinCount);m.analyser!.getFloatFrequencyData(v);return Math.max(...v)>-55;},{},{timeout:10000})));}catch(e){console.log('audio diagnostics',await Promise.all(pages.map(p=>p.evaluate(async()=>{const m=(window as unknown as MediaWindow).media;return {room:m.room.state,audio:m.audio.state,remote:!!m.remote,track:m.remote?.mediaStreamTrack.readyState,stats:await m.remote?.getReceiverStats()};}))));throw e;}
   const samples=await Promise.all(pages.map(p=>p.evaluate(async()=>{const m=(window as unknown as MediaWindow).media;const v=new Float32Array(m.analyser!.frequencyBinCount);m.analyser!.getFloatFrequencyData(v);let peak=0;for(let i=1;i<v.length;i++)if(v[i]>v[peak])peak=i;const stats=await m.remote!.getReceiverStats();return {peakHz:peak*m.audio.sampleRate/m.analyser!.fftSize,peakDb:v[peak],bytesReceived:stats?.bytesReceived,packetsReceived:stats?.packetsReceived};})));
   assert.ok(Math.abs(samples[0].peakHz-880)<25,JSON.stringify(samples));assert.ok(Math.abs(samples[1].peakHz-440)<25,JSON.stringify(samples));assert.ok(samples.every(s=>(s.bytesReceived??0)>0));
   // Real SDK mute stops the published track. Verify remote silence, then resume.
   await pages[0].evaluate(async()=>{await (window as unknown as MediaWindow).media.local!.mute();});
   await pages[1].waitForFunction(()=>{const m=(window as unknown as MediaWindow).media,v=new Float32Array(m.analyser!.frequencyBinCount);m.analyser!.getFloatFrequencyData(v);return Math.max(...v)<-65;},{},{timeout:8000});
   await pages[0].evaluate(async()=>{await (window as unknown as MediaWindow).media.local!.unmute();});
   await pages[1].waitForFunction(()=>{const m=(window as unknown as MediaWindow).media,v=new Float32Array(m.analyser!.frequencyBinCount);m.analyser!.getFloatFrequencyData(v);return Math.max(...v)>-55;});
   if(reason==='end')await api(customer,`/calls/${c.id}/actions`,{action:'end',expected_version:accepted.version});else await api(owner,'/auth/logout',{});
   await Promise.all(pages.map(p=>p.waitForFunction(()=>(window as unknown as MediaWindow).media.disconnected,{}, {timeout:8000})));
   const final=await api(customer,`/calls/${c.id}`);assert.equal(final.state,reason==='end'?'ended':'revoked');
   const rejoin=await Promise.all(pages.map((page,i)=>page.evaluate(async({original,url})=>{const w=window as unknown as MediaWindow,L=w.LivekitClient;const cached=w.media.refreshed||original;let denied=0;for(const token of new Set([original,cached])){const room=new L.Room();try{await room.connect(url,token);await room.disconnect();}catch{denied++;}}return {attempts:new Set([original,cached]).size,denied};},{original:tokens[i].token,url:tokens[i].url})));
   assert.ok(rejoin.every(r=>r.attempts===r.denied),JSON.stringify(rejoin));
   summary.push({reason,samples,muting:'remote silence then audio recovered',server_disconnect:'both browsers disconnected',cached_token_rejoin:rejoin,final_state:final.state});
   await Promise.all(pages.map(p=>p.evaluate(async()=>{const m=(window as unknown as MediaWindow).media;m.osc.stop();await m.room.disconnect();await m.audio.close();})));
  }
  const result={checked_at:new Date().toISOString(),livekit:'1.13.10',client:'2.23.0',room_auto_create:false,kind:'generated 440Hz/880Hz audio through actual local LiveKit SFU; no human microphone/device proof',checks:summary};
  await mkdir(new URL('../../../../.local/p2/',import.meta.url),{recursive:true});await writeFile(new URL('../../../../.local/p2/calls-audio-evidence.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser?.close();await new Promise<void>(r=>server.close(()=>r()));await f.close();}
});
