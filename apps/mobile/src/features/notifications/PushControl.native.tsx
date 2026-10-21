import {useState} from 'react';
import {Platform,View} from 'react-native';
import Constants from 'expo-constants';
import {randomUUID} from 'expo-crypto';
import {useAuth} from '../../app/providers/AuthProvider';
import {useLocale} from '../../app/providers/LocaleProvider';
import {Button} from '../../components/ui/Button';
import {AppText} from '../../components/ui/AppText';
export function PushControl({owner}:{owner:string}){
 const {manager}=useAuth(),{t}=useLocale();const [busy,setBusy]=useState(false),[status,setStatus]=useState<''|'projectRequired'|'permissionDenied'|'registered'|'failed'>('');
 const register=async()=>{setBusy(true);setStatus('');try{
  const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId??process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if(!projectId){setStatus('projectRequired');return;}
  // Load only when needed so an older development build can show a recoverable error.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const n=require('expo-notifications') as typeof import('expo-notifications');
  if(Platform.OS==='android')await n.setNotificationChannelAsync('default',{name:'Dịch vụ quanh bạn',importance:n.AndroidImportance.DEFAULT});
  const permission=await n.requestPermissionsAsync();if(!permission.granted){setStatus('permissionDenied');return;}
  const token=(await n.getExpoPushTokenAsync({projectId})).data;
  await manager.registerPushDevice(owner,{token,platform:Platform.OS},randomUUID());setStatus('registered');
 }catch{setStatus('failed');}finally{setBusy(false);}};
 return <View style={{gap:12}}><Button testID="push-register" label={t('push.register')} disabled={busy} onPress={()=>void register()}/>{status&&<AppText accessibilityLiveRegion="polite">{t(`push.${status}`)}</AppText>}</View>;
}
