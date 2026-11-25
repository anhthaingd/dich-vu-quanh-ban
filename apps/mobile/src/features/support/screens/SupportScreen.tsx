import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LanguageSettings} from '../../accounts/components/LanguageSettings';
import {translator} from '../../admin/messages';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {SegmentedTabs} from '../../../components/ui/SegmentedTabs';
import * as ImagePicker from 'expo-image-picker';
import {EvidencePhoto} from './EvidencePhoto';
import type {EvidenceAsset} from '../api/support-api';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AccountPage,useAccountRefresh} from '../../accounts/components/AccountPage';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {Input} from '../../../components/ui/Input';
import {RefreshError} from '../../../components/ui/Feedback';
import {ActionError,captureError,withDetail} from '../../chat/components/ActionError';
import {sessionReady} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {ApiError} from '../../../lib/http/api-error';
import {toErrorInfo,type ErrorInfo} from '../../../lib/errors/describe';
import {formatBusinessDate} from '../../../lib/i18n/formatters';
import {reportStates,type Report,type ReportContext,type ReportState} from '../models';
type Props=NativeStackScreenProps<RootStackParamList,'Support'>;
export function SupportScreen({navigation,route}:Props){
 const context=route.params?.context;
 return <AccountPage title="support.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:route.params?.id?{screen:'Support',params:{id:route.params.id}}:'Support'})}>{owner=><Desk key={`${owner}:${JSON.stringify(context)}:${route.params?.id??''}`} owner={owner} context={context} initialId={route.params?.id}/>}</AccountPage>;
}
function Desk({owner,context,initialId}:{owner:string;context?:ReportContext;initialId?:string}){
 const {manager,state:auth}=useAuth(),{t,locale}=useLocale();
 const [items,setItems]=useState<Report[]>([]),[selected,setSelected]=useState<Report|null>(null),[creating,setCreating]=useState(!!context),[body,setBody]=useState(''),[subject,setSubject]=useState('');
 const [photos,setPhotos]=useState<string[]>([]),[picking,setPicking]=useState(false);
 const [upload]=useState(()=>new Mutation<EvidenceAsset>()),up=useSyncExternalStore(upload.subscribe,upload.getSnapshot,upload.getSnapshot);
 const [filter,setFilter]=useState<ReportState|'all'>('all'),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState<ErrorInfo|null>(null),[attempt,setAttempt]=useState(0);
 const [sendError,setSendError]=useState<ErrorInfo|null>(null),[uploadError,setUploadError]=useState<ErrorInfo|null>(null);
 const [mutation,setMutation]=useState(()=>new Mutation<Report>()),state=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot);
 const [linkedId,setLinkedId]=useState(initialId);
 const active=useRef(false),generation=useRef(0),selectedId=selected?.id??linkedId;
 const blocked=busy||auth.busy||state.busy||state.pending||up.busy||up.pending||picking;
 const clearPrivate=useCallback(()=>{setItems([]);setSelected(null);setBody('');setSubject('');setPhotos([]);setCreating(false);setLoaded(false);},[]);
 useEffect(()=>{if(state.error&&['NOT_FOUND','FORBIDDEN','UNAUTHENTICATED'].includes(state.error))clearPrivate();},[state.error,clearPrivate]);
 const reload=useCallback(()=>{setAttempt(n=>n+1);return true;},[]);
 useAccountRefresh(busy,reload,!blocked);
 useRealtimeRefresh({busy:blocked||!!body||photos.length>0,error:error?.code??null,matches:s=>s.kind==='event'&&s.event.type==='report.updated.v1',refresh:()=>{reload();},revoke:()=>{clearPrivate();}});
 useFocusEffect(useCallback(()=>{
  active.current=true;const request=++generation.current;setBusy(true);setError(null);
  const valid=()=>active.current&&request===generation.current;
  async function read<T>(work:()=>Promise<T>):Promise<T>{for(let i=0;;i++){await sessionReady(manager,owner);if(!valid())throw new ApiError('CANCELLED');try{return await work();}catch(e){if(!(e instanceof ApiError)||e.code!=='BUSY'||i>=2)throw e;}}}
  void (async()=>{
   if(selectedId){const r=await read(()=>manager.getReport(owner,selectedId));if(valid())setSelected(r);}
   else {
    const all:Report[]=[],seen=new Set<string>();let cursor:string|undefined;
    do{const p=await read(()=>manager.listReports(owner,cursor));for(const r of p.items){const at=all.findIndex(x=>x.id===r.id);if(at<0)all.push(r);else if(r.version>all[at].version)all[at]=r;}cursor=p.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);}while(cursor&&valid());
    if(valid())setItems(all);
   }
   if(valid())setLoaded(true);
  })().catch(e=>{if(valid()){const info=toErrorInfo(e);setError(info);if(['NOT_FOUND','FORBIDDEN','UNAUTHENTICATED'].includes(info.code))clearPrivate();}}).finally(()=>{if(valid())setBusy(false);});
  return()=>{active.current=false;generation.current++;};
 },[manager,owner,selectedId,attempt,clearPrivate]));
 const finish=(r:Report|null)=>{if(r&&active.current){setSelected(r);setItems(all=>[r,...all.filter(x=>x.id!==r.id)]);setCreating(false);setBody('');setSubject('');setPhotos([]);reload();}};
 const send=()=>{const text=body.trim();if(!text)return;const id=selected?.id,ids=[...photos],input={...(context??{kind:'account' as const}),subject:subject.trim(),body:text,evidence_ids:ids};void mutation.run(captureError(k=>id?manager.replyReport(owner,id,text,ids,k):manager.createReport(owner,input,k),setSendError)).then(finish);};
 const back=()=>{setLinkedId(undefined);setSelected(null);setCreating(false);setBody('');setSubject('');setPhotos([]);setMutation(new Mutation<Report>());reload();};
 const loadPhoto=useCallback(async(id:string)=>{for(let i=0;;i++){await sessionReady(manager,owner);if(!active.current)throw new ApiError('CANCELLED');try{return await manager.evidenceAsset(owner,id);}catch(e){if(!(e instanceof ApiError)||e.code!=='BUSY'||i>=2)throw e;}}},[manager,owner]);
 const uploaded=(a:EvidenceAsset|null)=>{if(a&&active.current)setPhotos(ids=>ids.includes(a.id)?ids:[...ids,a.id]);};
 const pick=async()=>{setPicking(true);setError(null);try{
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
  if(result.canceled||!result.assets[0]||!active.current)return;
  const chosen=result.assets[0],raw=chosen.file??await(await fetch(chosen.uri)).blob(),blob=raw.type?raw:raw.slice(0,raw.size,chosen.mimeType??'');
  if(!['image/png','image/jpeg','image/webp'].includes(blob.type))throw new ApiError('VALIDATION',undefined,undefined,undefined,undefined,'SUPPORT_PHOTO_TYPE_UNSUPPORTED');
  if(!blob.size||blob.size>10*1024*1024)throw new ApiError('VALIDATION',undefined,undefined,undefined,undefined,'SUPPORT_PHOTO_SIZE_INVALID');
  uploaded(await upload.run(captureError(k=>manager.uploadEvidence(owner,blob,k),setUploadError)));
 }catch(e){if(active.current)setError(e instanceof ApiError?toErrorInfo(e):{code:'NETWORK'});}finally{if(active.current)setPicking(false);}};
 const photoEditor=<><AppText>{t('support.photo')}</AppText>{photos.map(id=><Card key={id}><EvidencePhoto id={id} load={loadPhoto}/><Button testID={`evidence-remove-${id}`} label={t('support.removePhoto')} disabled={blocked} variant="secondary" onPress={()=>setPhotos(ids=>ids.filter(x=>x!==id))}/></Card>)}<Button testID="evidence-pick" label={t('support.pickPhoto')} disabled={blocked} variant="secondary" onPress={()=>void pick()}/></>;
 const visible=items.filter(r=>filter==='all'||r.state===filter);
 return <>
  <AppText variant="title">{t('support.intro')}</AppText><AppText tone="muted">{t('support.privacy')}</AppText>
  <RefreshError error={error} busy={blocked} retry={reload}/>{busy&&!loaded&&<AppText>{t('accountTools.loading')}</AppText>}
  {(selected||creating)&&<Button testID="support-list" label={t('support.list')} variant="link" disabled={blocked} onPress={back}/>}
  {selected?<Card><AppText testID="support-state" variant="section">{t(`support.${selected.state}`)}</AppText><AppText variant="section">{selected.subject}</AppText><AppText tone="muted" variant="caption">{selected.id}</AppText><AppText>{selected.body}</AppText>{selected.evidence_ids.map(id=><EvidencePhoto key={id} id={id} load={loadPhoto}/>)}{selected.job_id&&<AppText>{t('support.relatedJob',{id:selected.job_id})}</AppText>}
   {selected.updates.map((u,i)=><Card key={`${u.created_at}:${i}`}><AppText variant="caption">{t(u.actor_id===owner?'support.you':'support.team')}</AppText><AppText>{u.body}</AppText>{u.evidence_ids.map(id=><EvidencePhoto key={id} id={id} load={loadPhoto}/>)}<AppText tone="muted" variant="caption">{formatBusinessDate(new Date(u.created_at),locale)}</AppText></Card>)}
   {selected.state==='closed'?<AppText>{t('support.closedHint')}</AppText>:<><Input testID="support-body" label={t('support.addInfo')} multiline value={body} editable={!blocked} onChangeText={setBody}/>{photoEditor}<Button testID="support-send" label={t('support.sendUpdate')} disabled={blocked||!body.trim()||state.error==='STATE_CONFLICT'} onPress={send}/></>}
  </Card>:creating?<Card><AppText variant="section">{t('support.describe')}</AppText>{context?.job_id&&<AppText>{t('support.relatedJob',{id:context.job_id})}</AppText>}<Input testID="support-subject" label={t('support.subject')} value={subject} editable={!blocked} onChangeText={setSubject}/><Input testID="support-body" label={t('support.body')} multiline value={body} editable={!blocked} onChangeText={setBody}/>{photoEditor}<AppText tone="muted">{t('support.noMoney')}</AppText><Button testID="support-send" label={t('support.send')} disabled={blocked||!body.trim()||!subject.trim()} onPress={send}/></Card>:<>
   <Button testID="support-create" label={t('support.create')} disabled={blocked} onPress={()=>{setBody('');setSubject('');setPhotos([]);setCreating(true);}}/>
   <SegmentedTabs value={filter} onChange={setFilter} options={(['all',...reportStates] as const).map(value=>({value,label:t(`support.${value}`),testID:`support-filter-${value}`}))}/>

   {loaded&&!error&&!visible.length&&<AppText>{t('support.empty')}</AppText>}
   {visible.map(r=><Card key={r.id}><AppText variant="caption">{t(`support.${r.state}`)}</AppText><AppText variant="section">{r.subject}</AppText><AppText numberOfLines={3}>{r.body}</AppText><Button testID={`support-open-${r.id}`} label={t('support.view')} variant="secondary" disabled={blocked} onPress={()=>{setSelected(r);setBody('');}}/></Card>)}
  </>}
  <ActionError testID="support-upload-error" error={withDetail(up.error,uploadError)} busy={up.busy||auth.busy} retry={up.pending?()=>void upload.run().then(uploaded):undefined}/>
  <ActionError testID="support-send-error" error={withDetail(state.error,sendError)} busy={state.busy||auth.busy} retry={state.pending?()=>void mutation.run().then(finish):undefined}/>
  {state.error==='STATE_CONFLICT'&&<Button label={t('accountTools.reload')} disabled={blocked} onPress={()=>{setMutation(new Mutation<Report>());reload();}}/>}
 </>;
}

export function RestrictedSupportScreen(){
 const {manager,state}=useAuth(),{locale}=useLocale(),t=translator(locale);
 return <SafeAreaView style={{flex:1}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,gap:16}}><AppText variant="title">{t('reports')}</AppText><AppText>{t('supportOnly')}</AppText><LanguageSettings/><Button label={t('logout')} onPress={()=>void manager.logout()} disabled={state.busy}/>{state.user&&<Desk key={state.user.id} owner={state.user.id}/>}</ScrollView></SafeAreaView>;
}
