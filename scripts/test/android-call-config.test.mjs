import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {compileModsAsync,XML}=require('expo/config-plugins');
const plugin=require('../../apps/mobile/plugins/with-android-calls.cjs');
test('Android call plugin is repeatable and keeps native call entry points private with one FCM receiver',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dvqb-call-config-'));
 const write=async(p,s)=>{await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),s);};
 try {
  await write('android/app/src/main/AndroidManifest.xml','<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="vn.dichvuquanhban.app"><application android:label="DEMO"><activity android:name=".MainActivity" android:exported="true" /></application></manifest>');
  await write('android/app/src/main/java/vn/dichvuquanhban/app/MainApplication.kt','package vn.dichvuquanhban.app\nclass MainApplication { val packages = PackageList(this).packages.apply { } }');
  await write('android/app/build.gradle','android { defaultConfig { applicationId "vn.dichvuquanhban.app" } }\ndependencies { }');
  await write('android/settings.gradle',"rootProject.name='DEMO'\n");
  const generate=()=>compileModsAsync(plugin({name:'DEMO',slug:'demo',android:{package:'vn.dichvuquanhban.app'}}),{projectRoot:root,platforms:['android']});
  await generate();const once=await fs.readFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');await generate();assert.equal(await fs.readFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8'),once);
  const xml=await XML.parseXMLAsync(once),app=xml.manifest.application[0];
  const service=app.service.find(s=>s.$['android:name'].endsWith('CallAudioService'));assert.equal(service.$['android:exported'],'false');assert.equal(service.$['android:foregroundServiceType'],'phoneCall|microphone');
  assert.equal(app.activity.find(a=>a.$['android:name'].endsWith('CallActivity')).$['android:exported'],'false');
  assert.equal(app.receiver[0].$['android:exported'],'false');
  assert.equal(app.service.find(s=>s.$['android:name'].endsWith('CallConnectionService')).$['android:permission'],'android.permission.BIND_TELECOM_CONNECTION_SERVICE');
  assert.equal(app.service.filter(s=>s['intent-filter']?.some(f=>f.action?.some(a=>a.$['android:name']==='com.google.firebase.MESSAGING_EVENT'))).length,1);
  assert.equal(app.service.find(s=>s.$['android:name'].endsWith('ExpoFirebaseMessagingService')).$['tools:node'],'remove');
  const main=await fs.readFile(path.join(root,'android/app/src/main/java/vn/dichvuquanhban/app/MainApplication.kt'),'utf8');assert.equal(main.match(/add\(vn.dichvuquanhban.calls.AndroidCallsPackage\(\)\)/g).length,1);
  const gradle=await fs.readFile(path.join(root,'android/app/build.gradle'),'utf8');assert.equal(gradle.match(/firebase-messaging:25.0.1/g).length,1);
  for(const name of ['AndroidCallsModule.kt','CallActivity.kt','CallAudioService.kt','CallRuntime.kt'])assert.equal(await fs.readFile(path.join(root,'android/app/src/main/java/vn/dichvuquanhban/calls',name),'utf8'),await fs.readFile(new URL('../../apps/mobile/plugins/android-calls/'+name,import.meta.url),'utf8'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
