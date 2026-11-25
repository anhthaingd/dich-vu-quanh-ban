import {useState} from 'react';
import {Platform,View} from 'react-native';
import Constants from 'expo-constants';
import {randomUUID} from 'expo-crypto';
import {useAuth} from '../../app/providers/AuthProvider';
import {useLocale} from '../../app/providers/LocaleProvider';
import {Button} from '../../components/ui/Button';
import {AppText} from '../../components/ui/AppText';
import {ErrorMessage} from '../../components/ui/ErrorMessage';
import {toErrorInfo,type ErrorInfo} from '../../lib/errors/describe';
// Each failure says exactly where registration stopped: build config, OS permission,
// native module/token on this device, or the server refusing the device.
type Status=''|'projectRequired'|'permissionDenied'|'registered'|ErrorInfo;
export function PushControl({owner}:{owner:string}){
 const {manager}=useAuth(),{t}=useLocale();const [busy,setBusy]=useState(false),[status,setStatus]=useState<Status>('');
 const register=async()=>{setBusy(true);setStatus('');try{
  const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId??process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if(!projectId){setStatus('projectRequired');return;}
  // Load only when needed so an older development build can show a recoverable error.
  let n:typeof import('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try{n=require('expo-notifications') as typeof import('expo-notifications');}catch{setStatus({code:'CONFIG',reason:'PUSH_MODULE_UNAVAILABLE'});return;}
  let token:string;
  try{
   if(Platform.OS==='android')await n.setNotificationChannelAsync('default',{name:'Dịch vụ quanh bạn',importance:n.AndroidImportance.DEFAULT});
   const permission=await n.requestPermissionsAsync();if(!permission.granted){setStatus('permissionDenied');return;}
   token=(await n.getExpoPushTokenAsync({projectId})).data;
  }catch{setStatus({code:'NETWORK',reason:'PUSH_DEVICE_TOKEN_FAILED'});return;}
  // A refusal from our server carries its own reason (e.g. PUSH_TOKEN_INVALID).
  try{await manager.registerPushDevice(owner,{token,platform:Platform.OS},randomUUID());setStatus('registered');}catch(e){setStatus(toErrorInfo(e));}
 }finally{setBusy(false);}};
 return <View style={{gap:12}}><Button testID="push-register" label={t('push.register')} disabled={busy} onPress={()=>void register()}/>{typeof status==='string'?status&&<AppText testID="push-status" accessibilityLiveRegion="polite">{t(`push.${status}`)}</AppText>:<ErrorMessage testID="push-status" error={status}/>}</View>;
}
