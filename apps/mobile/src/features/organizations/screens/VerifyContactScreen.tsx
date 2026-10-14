import {useEffect,useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AccountPage} from '../../accounts/components/AccountPage';
import {AppText} from '../../../components/ui/AppText';
import {Card} from '../../../components/ui/Card';
import {Input} from '../../../components/ui/Input';
import {Button} from '../../../components/ui/Button';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {TeamFeedback} from './TeamFeedback';
import type {Challenge} from '../models';
export function VerifyContactScreen({navigation}:NativeStackScreenProps<RootStackParamList,'VerifyContact'>){return <AccountPage title="team.verifyTitle" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:'VerifyContact'})}>{owner=><VerifyForm key={owner} owner={owner}/>}</AccountPage>;}
function VerifyForm({owner}:{owner:string}){
 const {manager,state}=useAuth(),{t}=useLocale();const [contact,setContact]=useState(''),[code,setCode]=useState(''),[challenge,setChallenge]=useState<Challenge|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null),[done,setDone]=useState(false),[until,setUntil]=useState(0),[clock,setClock]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const send=async()=>{if(busy||state.busy||Date.now()<until)return;setBusy(true);setError(null);setDone(false);setCode('');try{const c=await manager.requestChallenge(owner,contact);setChallenge(c);setUntil(Date.now()+c.resend_after_seconds*1000);}catch(e){setError(e instanceof ApiError?e.code:'NETWORK');setUntil(Date.now()+60000);}finally{setBusy(false);}};
 const verify=async()=>{if(!challenge||busy||state.busy)return;setBusy(true);setError(null);const value=code;setCode('');try{await manager.verifyChallenge(owner,challenge.id,value);await manager.loadProfile(owner);setDone(true);setChallenge(null);}catch(e){setError(e instanceof ApiError?e.code:'NETWORK');}finally{setBusy(false);}};
 const disabled=busy||state.busy,seconds=Math.max(0,Math.ceil((until-clock)/1000));
 return <><AppText tone="muted">{t('team.localHint')}</AppText><Card>
  <AppText>{t(state.user?.email_verified?'team.emailVerified':'team.emailUnverified')}</AppText><AppText>{t(state.user?.phone_verified?'team.phoneVerified':'team.phoneUnverified')}</AppText>
  <Input testID="verify-contact" label={t('team.contact')} hint={t('team.contactHint')} value={contact} editable={!disabled} autoCapitalize="none" autoCorrect={false} onChangeText={v=>{setContact(v);setChallenge(null);setDone(false);setCode('');}}/>
  <Button testID="verify-send" label={seconds?t('team.wait',{seconds}):t(challenge?'team.resendCode':'team.sendCode')} disabled={disabled||!contact.trim()||seconds>0} onPress={()=>void send()}/>
  {challenge&&<><AppText>{t('team.codeSent')}</AppText><Input testID="verify-code" label={t('team.code')} value={code} onChangeText={setCode} editable={!disabled} keyboardType="number-pad" secureTextEntry maxLength={6}/><Button testID="verify-confirm" label={t('team.verify')} disabled={disabled||!/^\d{6}$/.test(code)} onPress={()=>void verify()}/></>}
  <TeamFeedback error={error}/>{done&&<AppText testID="verify-done" accessibilityLiveRegion="polite">{t('team.verified')}</AppText>}
 </Card></>;
}
