import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {useEffect,useRef} from 'react';
export function PushListener({owner,ready=true,onRegister,onOpen}:{ready?:boolean;owner:string|undefined;onRegister:(token:string,platform:string)=>Promise<void>;onOpen:(data:Record<string,unknown>)=>Promise<boolean>}){
 const latest=useRef(onOpen);latest.current=onOpen;const register=useRef(onRegister);register.current=onRegister;
 const available=useRef(ready);available.current=ready;
 const pending=useRef<import('expo-notifications').NotificationResponse|null>(null);
 const replay=useRef<()=>Promise<void>>(async()=>{});
 useEffect(()=>{pending.current=null;let active=true,remove:()=>void=()=>{};const seen=new Set<string>();
  void (async()=>{
   // Conditional native loading also tolerates development builds made before this module was added.
   // eslint-disable-next-line @typescript-eslint/no-require-imports
   const n=require('expo-notifications') as typeof import('expo-notifications');
   const handle=async(r:import('expo-notifications').NotificationResponse|null)=>{
    if(!active||!owner||!r)return;const data=r.notification.request.content.data;
    if(!data||data.recipient_id!==owner)return;if(!available.current){pending.current=r;return;}const key=typeof data.event_key==='string'?data.event_key:r.notification.request.identifier;
    if(seen.has(key)){await n.clearLastNotificationResponseAsync();return;}seen.add(key);if(seen.size>200)seen.delete(seen.values().next().value!);
    try{if(await latest.current(data))await n.clearLastNotificationResponseAsync();else seen.delete(key);}catch{seen.delete(key);}
   };
   replay.current=async()=>{const r=pending.current;pending.current=null;await handle(r);};
   if(!active)return;
   let registering=false,lastNative:string|undefined,pendingNative:import('expo-notifications').DevicePushToken|undefined;
   const registerCurrent=async(supplied?:import('expo-notifications').DevicePushToken):Promise<void>=>{
    if(registering){if(supplied)pendingNative=supplied;return;}registering=true;
    try{
     const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId??process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
     if(!owner||!projectId||!(await n.getPermissionsAsync()).granted||!active)return;
     const nativeToken=supplied??await n.getDevicePushTokenAsync();
     const key=JSON.stringify(nativeToken);if(key===lastNative)return;lastNative=key;
     // iOS emits this token again on every native registration request. Reuse it
     // instead of requesting another token from inside its own callback.
     const token=await n.getExpoPushTokenAsync({projectId,devicePushToken:nativeToken});
     if(active)await register.current(token.data,Platform.OS);
    }finally{
     registering=false;const next=pendingNative;pendingNative=undefined;
     if(active&&next)void registerCurrent(next).catch(()=>{});
    }
   };
   void registerCurrent().catch(()=>{});const tokenSub=n.addPushTokenListener(token=>{void registerCurrent(token).catch(()=>{});});
   const sub=n.addNotificationResponseReceivedListener(r=>{void handle(r);});remove=()=>{sub.remove();tokenSub.remove();};await handle(await n.getLastNotificationResponseAsync());
  })().catch(()=>{});return()=>{active=false;remove();};
 },[owner]);
 useEffect(()=>{if(ready)void replay.current();},[ready,owner]);return null;
}
