const fs=require('node:fs/promises');
const path=require('node:path');
const {withAndroidManifest,withMainApplication,withAppBuildGradle,withDangerousMod}=require('expo/config-plugins');
const prefix='vn.dichvuquanhban.calls.';
module.exports=config=>{
 config=withAndroidManifest(config,mod=>{
  const m=mod.modResults.manifest;m.$['xmlns:tools']='http://schemas.android.com/tools';
  m['uses-permission']??=[];
  for(const name of ['MANAGE_OWN_CALLS','FOREGROUND_SERVICE','FOREGROUND_SERVICE_PHONE_CALL','FOREGROUND_SERVICE_MICROPHONE','WAKE_LOCK','USE_FULL_SCREEN_INTENT','POST_NOTIFICATIONS']){
   if(!m['uses-permission'].some(p=>p.$['android:name']==='android.permission.'+name))m['uses-permission'].push({$:{'android:name':'android.permission.'+name}});
  }
  const app=m.application[0];app.service??=[];app.receiver??=[];app.activity??=[];
  const add=(list,entry)=>{const name=entry.$['android:name'];const old=list.findIndex(e=>e.$['android:name']===name);if(old>=0)list[old]=entry;else list.push(entry);};
  add(app.service,{$:{'android:name':'expo.modules.notifications.service.ExpoFirebaseMessagingService','tools:node':'remove'}});
  add(app.service,{$:{'android:name':prefix+'CallFirebaseService','android:exported':'false'},'intent-filter':[{action:[{$:{'android:name':'com.google.firebase.MESSAGING_EVENT'}}]}]});
  add(app.service,{$:{'android:name':prefix+'CallConnectionService','android:exported':'true','android:permission':'android.permission.BIND_TELECOM_CONNECTION_SERVICE'},'intent-filter':[{action:[{$:{'android:name':'android.telecom.ConnectionService'}}]}]});
  add(app.service,{$:{'android:name':prefix+'CallAudioService','android:exported':'false','android:foregroundServiceType':'phoneCall|microphone','android:stopWithTask':'true'}});
  add(app.receiver,{$:{'android:name':prefix+'CallEndReceiver','android:exported':'false'}});
  add(app.activity,{$:{'android:name':prefix+'CallActivity','android:exported':'false','android:excludeFromRecents':'true','android:showWhenLocked':'true','android:turnScreenOn':'true','android:theme':'@android:style/Theme.Material.NoActionBar'}});
  return mod;
 });
 config=withMainApplication(config,mod=>{
  if(!mod.modResults.contents.includes('add(vn.dichvuquanhban.calls.AndroidCallsPackage())')){
   const marker='PackageList(this).packages.apply {';
   if(!mod.modResults.contents.includes(marker))throw Error('Android calls: review MainApplication package registration');
   mod.modResults.contents=mod.modResults.contents.replace(marker,marker+'\n          add(vn.dichvuquanhban.calls.AndroidCallsPackage())');
  }return mod;
 });
 config=withAppBuildGradle(config,mod=>{
  // Same version as the installed expo-notifications SDK; one FCM service, no second token registration.
  const dependency="implementation 'com.google.firebase:firebase-messaging:25.0.1'";
  if(!mod.modResults.contents.includes(dependency))mod.modResults.contents=mod.modResults.contents.replace('dependencies {','dependencies {\n    '+dependency);
  if(!mod.modResults.contents.includes('vn.dichvuquanhban.calls.CallInstrumentation'))mod.modResults.contents=mod.modResults.contents.replace('defaultConfig {',`defaultConfig {
        testInstrumentationRunner "vn.dichvuquanhban.calls.CallInstrumentation"`);
  return mod;
 });
 return withDangerousMod(config,['android',async mod=>{
  const target=path.join(mod.modRequest.platformProjectRoot,'app/src/main/java/vn/dichvuquanhban/calls');
  await fs.mkdir(target,{recursive:true});
  for(const name of await fs.readdir(path.join(__dirname,'android-calls')))if(name.endsWith('.kt'))await fs.copyFile(path.join(__dirname,'android-calls',name),path.join(target,name));
  const tests=path.join(mod.modRequest.platformProjectRoot,'app/src/androidTest/java/vn/dichvuquanhban/calls');
  await fs.mkdir(tests,{recursive:true});
  await fs.copyFile(path.join(__dirname,'android-calls-tests/CallInstrumentation.kt'),path.join(tests,'CallInstrumentation.kt'));
  return mod;
 }]);
};
