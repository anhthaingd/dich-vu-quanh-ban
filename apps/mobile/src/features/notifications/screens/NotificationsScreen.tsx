import {PushControl} from '../PushControl';
import {useCallback,useState,useSyncExternalStore} from 'react';
import {Pressable,StyleSheet,Switch,View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AccountPage,useAccountRefresh} from '../../accounts/components/AccountPage';
import {LoadingState,RefreshError} from '../../../components/ui/Feedback';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import {sessionReady} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {formatBusinessDate} from '../../../lib/i18n/formatters';
import {useNotifications} from '../NotificationsProvider';
import type {Notice,NotificationSettings} from '../api/notifications-api';
const labels={'job.requested':'requested','job.decline':'declined','job.withdraw':'withdrawn','job.stop':'stopped','invoice.revision_requested.v1':'revision','job.accepted.v1':'accepted','job.assigned.v1':'assigned','job.schedule_changed.v1':'schedule','invoice.sent.v1':'invoice','invoice.locked.v1':'locked','invoice.payment_reported.v1':'payment','invoice.settled.v1':'settled','reminder.24h':'reminder24','reminder.1h':'reminder1'} as const;
type Navigation=NativeStackScreenProps<RootStackParamList,'Notifications'>['navigation'];
export function NotificationsScreen({navigation}:NativeStackScreenProps<RootStackParamList,'Notifications'>){
  return <AccountPage title="notices.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:'Notifications'})}
    shell={{activeTab:'notifications',onAccount:()=>navigation.navigate('Account'),onCatalog:()=>navigation.popTo('CatalogHome'),onJobs:()=>navigation.navigate('Jobs'),onMessages:()=>navigation.navigate('Conversations'),onNotifications:()=>navigation.navigate('Notifications')}}>
    {owner=><Inbox key={owner} owner={owner} navigation={navigation}/>}</AccountPage>;
}
function Inbox({owner,navigation}:{owner:string;navigation:Navigation}){
  const {items,loading,loaded,error,refresh,markRead}=useNotifications(),{manager,state}=useAuth(),{t,locale}=useLocale();
  const [unread,setUnread]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState<ApiErrorCode|null>(null),[retry,setRetry]=useState<(()=>Promise<void>)|null>(null);
  const [pulling,setPulling]=useState(false);
  const reload=()=>{if(loading||busy||state.busy)return false;setPulling(true);void refresh().finally(()=>setPulling(false));return true;};
  useAccountRefresh(pulling,reload,!loading&&!busy&&!state.busy);
  const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setFailure(null);setRetry(()=>work);try{await sessionReady(manager,owner);await work();setRetry(null);}catch(e){setFailure(e instanceof ApiError?e.code:'NETWORK');}finally{setBusy(false);}};
  const open=async(n:Notice)=>{await markRead([n.id]);const r=n.resource_ref;
    // Fetch the target with current authorization before navigation. No arbitrary URL from notification data.
    if(r.report_id){await manager.getReport(owner,r.report_id);navigation.navigate('Support',{id:r.report_id});}
    else if(r.verification_id&&r.partner_id){await manager.listVerifications(owner,r.partner_id);navigation.navigate('Verification',{id:r.partner_id});}
    else if(r.review_id&&r.job_id){await manager.jobReviews(owner,r.job_id);navigation.navigate('Reviews',{id:r.job_id});}
    else if(r.invoice_id){if(!r.job_id)throw new ApiError('INVALID_RESPONSE');await manager.getInvoice(owner,r.job_id);navigation.navigate('Invoice',{id:r.job_id});}
    else if(r.job_id){await manager.getJob(owner,r.job_id);navigation.navigate('JobDetail',{id:r.job_id});}
  };
  const visible=items.filter(n=>!unread||!n.read_at),disabled=busy||state.busy;
  return <Card><View style={styles.tools}><Button testID="notices-all" label={t('notices.all')} variant={unread?'secondary':'primary'} onPress={()=>setUnread(false)}/><Button testID="notices-unread" label={t('notices.unread')} variant={unread?'primary':'secondary'} onPress={()=>setUnread(true)}/></View>
    <Button testID="notices-read-all" label={t('notices.readAll')} variant="secondary" disabled={disabled||!items.some(n=>!n.read_at)} onPress={()=>void run(()=>markRead(items.filter(n=>!n.read_at).map(n=>n.id)))}/>
    <JobFeedback error={failure} busy={disabled} retry={retry?()=>void run(retry):undefined}/>
    <RefreshError error={error} busy={disabled||loading} retry={reload}/>
    {loading&&!loaded&&!error&&!pulling&&<LoadingState message={t('accountTools.loading')}/>}
    {loaded&&!error&&!visible.length&&<AppText testID="notices-empty">{t(unread?'notices.caughtUp':'notices.empty')}</AppText>}
    {visible.map(n=><Pressable testID={`notice-${n.id}`} key={n.id} accessibilityRole="button" disabled={disabled} onPress={()=>void run(()=>open(n))} style={[styles.notice,!n.read_at&&styles.unread]}>
      <AppText>{t(`notices.${labels[n.kind as keyof typeof labels]??'updated'}`)}</AppText><AppText variant="caption" tone="muted">{t(n.read_at?'notices.read':'notices.unread')} · {formatBusinessDate(new Date(n.created_at),locale)}</AppText>
    </Pressable>)}
  </Card>;
}
export function NotificationSettingsScreen({navigation}:NativeStackScreenProps<RootStackParamList,'NotificationSettings'>){return <AccountPage title="notices.settings" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:'NotificationSettings'})}>{owner=><Settings key={owner} owner={owner}/>}</AccountPage>;}
function Settings({owner}:{owner:string}){
  const {manager,state}=useAuth(),{t}=useLocale();const [value,setValue]=useState<NotificationSettings|null>(null),[error,setError]=useState<ApiErrorCode|null>(null),[attempt,setAttempt]=useState(0),[saved,setSaved]=useState(false);
  const [mutation]=useState(()=>new Mutation<NotificationSettings>()),m=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot);
  useFocusEffect(useCallback(()=>{let active=true;setError(null);void (async()=>{await sessionReady(manager,owner);const s=await manager.notificationSettings(owner);if(active)setValue(s);})().catch(e=>{if(active)setError(e instanceof ApiError?e.code:'NETWORK');});return()=>{active=false;};},[manager,owner,attempt]));
  const save=async()=>{if(!value)return;setSaved(false);const result=await mutation.run(k=>manager.saveNotificationSettings(owner,value,k));if(result){setValue(result);setSaved(true);}};
  return <Card><AppText>{t('notices.settingsHint')}</AppText><PushControl owner={owner}/><JobFeedback error={error??m.error} pending={m.pending} busy={state.busy} retry={()=>void (m.error?save():setAttempt(n=>n+1))}/>
    {value?(['message_push','call_push','service_push','reminder_push'] as const).map(k=><View key={k} style={styles.setting}><AppText style={{flex:1}}>{t(`notices.${k}`)}</AppText><Switch testID={`setting-${k}`} accessibilityLabel={t(`notices.${k}`)} value={value[k]} accessibilityState={{disabled:state.busy||m.pending}} disabled={state.busy||m.pending} onValueChange={v=>{setValue({...value,[k]:v});setSaved(false);}}/></View>):!error&&<AppText>{t('accountTools.loading')}</AppText>}
    <Button testID="notices-save" label={t('notices.save')} disabled={!value||state.busy||m.busy} onPress={()=>void save()}/>{saved&&<AppText testID="notices-saved" accessibilityLiveRegion="polite">{t('notices.saved')}</AppText>}
  </Card>;
}
const styles=StyleSheet.create({tools:{flexDirection:'row',gap:8,flexWrap:'wrap'},notice:{borderWidth:1,borderColor:'#DCE2EC',borderRadius:12,padding:18,gap:8},unread:{borderLeftWidth:4,borderLeftColor:'#2457D6'},setting:{flexDirection:'row',alignItems:'center',gap:20,borderWidth:1,borderColor:'#DCE2EC',borderRadius:12,padding:16}});
