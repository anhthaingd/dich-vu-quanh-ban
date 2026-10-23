import {MfaSecurity} from './MfaSecurity';
import {mfaText} from '../mfa-messages';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Keyboard,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {Card} from '../../../components/ui/Card';
import {LanguageSettings} from '../../accounts/components/LanguageSettings';
import {codeOf,errorText} from './presentation';
import {theme} from '../../../theme/tokens';
import {AdminApi} from '../api/admin-api';
import {translator} from '../messages';
import {P2Desk} from './P2Desk';
export function AdminScreen(){
 const {manager,state}=useAuth(),{locale}=useLocale();
 const client=useMemo(()=>new AdminApi(manager,state.user!.id,process.env.EXPO_PUBLIC_API_URL),[manager,state.user?.id]);
 const t=useMemo(()=>translator(locale),[locale]);
 const [ready,setReady]=useState(false),[enrolled,setEnrolled]=useState<boolean|null>(null),[setup,setSetup]=useState(''),[enrollmentPending,setEnrollmentPending]=useState(false),[password,setPassword]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[epoch,setEpoch]=useState(0);
 const [recovery,setRecovery]=useState(false),mt=mfaText(locale);
 const generation=useRef(0);
 const clear=()=>{generation.current++;client.clear();setReady(false);setSetup('');setPassword('');setCode('');setRecovery(false);setBusy(false);setEpoch(n=>n+1);};
 useEffect(()=>{
  const sub=AppState.addEventListener('change',s=>{if(s==='background')clear();});
  return()=>{generation.current++;client.clear();sub.remove();};
 },[client]);
 useEffect(()=>{if(!ready)return;const timer=setTimeout(clear,Math.max(0,client.expiresAt-Date.now()));return()=>clearTimeout(timer);},[ready,client,epoch]);
 useEffect(()=>{let live=true;void client.status().then(v=>{if(live)setEnrolled(v);}).catch(e=>{if(live&&codeOf(e)!=='CANCELLED')setError(codeOf(e));});return()=>{live=false;};},[client,epoch]);
 const fail=(e:unknown)=>{const c=codeOf(e);if(c==='CANCELLED')return;if(['FORBIDDEN','UNAUTHENTICATED','REAUTH_REQUIRED'].includes(c))clear();setError(c);};
 const submit=async()=>{
  if(busy||!password||enrolled===null)return;
  Keyboard.dismiss();const gen=generation.current;setBusy(true);setError('');
  try{if(!enrolled&&!enrollmentPending){const value=await client.enroll(password);if(gen===generation.current){setSetup(value.secret);setEnrollmentPending(true);}}
   else{await client.verify(password,code,!enrolled,recovery);if(gen===generation.current){setReady(true);setEnrolled(true);setEnrollmentPending(false);setSetup('');setPassword('');setCode('');}}}
  catch(e){if(gen===generation.current){fail(e);try{const enabled=await client.status();if(gen===generation.current){setEnrolled(enabled);if(enabled)setSetup('');}}catch{/* Keep the original error. */}}}
  finally{if(gen===generation.current)setBusy(false);}
 };
 const lock=async()=>{clear();try{await client.lock();}catch(e){setError(codeOf(e));}};
 return <SafeAreaView style={styles.root} testID="admin-root"><KeyboardAvoidingView style={styles.root} behavior={Platform.OS==='ios'?'padding':undefined}>
  <View style={styles.top}><AppText tone="surface" variant="card">Dịch vụ quanh bạn</AppText><AppText tone="surface" variant="caption">{t('eyebrow')}</AppText></View>
  <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
   {ready?<><MfaSecurity client={client} owner={state.user!.id} canReset={state.user!.admin_permissions.includes('grant.manage')} fail={fail} replaced={secret=>{clear();setEnrolled(false);setSetup(secret);setEnrollmentPending(true);}}/><P2Desk key={epoch} owner={state.user!.id} client={client} grants={state.user!.admin_permissions} t={t} locale={locale} fail={fail} lock={()=>void lock()}/></>:<Card>
    <AppText variant="title" accessibilityRole="header">{t(enrolled?'reauth':'setup')}</AppText>
    {enrolled===null?<Button label={t('retry')} onPress={()=>{setError('');setEpoch(n=>n+1);}}/>:<>
    {setup&&<><AppText>{t('setupHint')}</AppText><AppText>{t('secret')}</AppText><AppText selectable testID="admin-setup-secret">{setup}</AppText></>}
    <Input testID="admin-password" label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} maxLength={128}/>
    {(enrolled||enrollmentPending)&&<Input testID="admin-code" label={recovery?mt.code:t('code')} value={code} onChangeText={setCode} keyboardType={recovery?'default':'number-pad'} autoCapitalize="none" autoComplete="one-time-code" maxLength={recovery?32:6} editable={!busy}/>}
    {enrolled&&<Button testID="admin-recovery-toggle" label={recovery?mt.totp:mt.use} disabled={busy} variant="link" onPress={()=>{setRecovery(!recovery);setCode('');}}/>}
    <Button testID="admin-verify" label={t(!enrolled&&!enrollmentPending?'enroll':'verify')} loading={busy} disabled={!password||!!(enrolled||enrollmentPending)&&!(recovery?/^[a-f0-9]{32}$/:/^\d{6}$/).test(code)} onPress={()=>void submit()}/>
    {!enrolled&&enrollmentPending&&<Button label={t('enroll')} variant="link" disabled={busy} onPress={()=>{setSetup('');setCode('');setEnrollmentPending(false);}}/>}</>}
    {error&&<AppText accessibilityRole="alert" tone="error">{errorText(error,t)}</AppText>}
   </Card>}
   <Card><LanguageSettings/><Button testID="admin-logout" label={t('logout')} variant="secondary" disabled={state.busy||busy} onPress={()=>{clear();void manager.logout();}}/></Card>
  </ScrollView>
 </KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:theme.colors.background},top:{backgroundColor:'#17253d',padding:16,gap:6},content:{padding:16,gap:20,width:'100%',maxWidth:760,alignSelf:'center'}});
