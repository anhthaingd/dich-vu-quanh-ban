import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AccountPage,useAccountRefresh} from '../../accounts/components/AccountPage';
import {AppText} from '../../../components/ui/AppText';
import {Input} from '../../../components/ui/Input';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {RefreshError} from '../../../components/ui/Feedback';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import {sessionReady} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {EvidencePhoto} from '../../support/screens/EvidencePhoto';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {formatBusinessDate} from '../../../lib/i18n/formatters';
import type {Verification,VerificationAsset} from '../api/verification-api';
export function VerificationScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,'Verification'>){return <AccountPage title="verification.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:'Partners'})}>{owner=><VerificationDesk key={owner+route.params.id} owner={owner} id={route.params.id}/>}</AccountPage>;}
export function VerificationDesk({owner,id}:{owner:string;id:string}){
 const {manager,state:auth}=useAuth(),{t,locale}=useLocale();const [kind,setKind]=useState<Verification['kind']>('identity'),[partnerKind,setPartnerKind]=useState(''),[items,setItems]=useState<Verification[]>([]),[statement,setStatement]=useState(''),[photos,setPhotos]=useState<string[]>([]),[busy,setBusy]=useState(false),[picking,setPicking]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null),[attempt,setAttempt]=useState(0);
 const [mutation,setMutation]=useState(()=>new Mutation<Verification>()),m=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot),[upload]=useState(()=>new Mutation<VerificationAsset>()),u=useSyncExternalStore(upload.subscribe,upload.getSnapshot,upload.getSnapshot);
 const live=useRef(false),generation=useRef(0);const blocked=busy||picking||auth.busy||m.busy||m.pending||u.busy||u.pending;
 const clear=useCallback(()=>{setItems([]);setPhotos([]);setStatement('');setLoaded(false);},[]);
 const reload=useCallback(()=>{setAttempt(n=>n+1);return true;},[]);useAccountRefresh(busy,reload,!blocked);
 useEffect(()=>{if(m.error&&['FORBIDDEN','UNAUTHENTICATED','NOT_FOUND'].includes(m.error))clear();},[m.error,clear]);
 useRealtimeRefresh({busy:blocked||!!statement||photos.length>0,error,matches:s=>s.kind==='event'&&s.event.type==='verification.updated.v1',refresh:()=>{reload();},revoke:()=>{clear();}});
 useFocusEffect(useCallback(()=>{live.current=true;const gen=++generation.current;setBusy(true);setError(null);const valid=()=>live.current&&gen===generation.current;
  void (async()=>{await sessionReady(manager,owner);const p=await manager.loadPartner(owner,id);if(valid())setPartnerKind(p.kind);
   const all:Verification[]=[],seen=new Set<string>();let cursor:string|undefined;do{await sessionReady(manager,owner);if(!valid())return;const page=await manager.listVerifications(owner,id,cursor);all.push(...page.items);cursor=page.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);}while(cursor&&valid());if(valid()){setItems(all);setLoaded(true);}
  })().catch(e=>{if(valid()){const code=e instanceof ApiError?e.code:'NETWORK';setError(code);if(['FORBIDDEN','UNAUTHENTICATED','NOT_FOUND'].includes(code))clear();}}).finally(()=>{if(valid())setBusy(false);});return()=>{live.current=false;generation.current++;};
 },[manager,owner,id,attempt,clear]));
 const latest=items.find(r=>r.kind===kind),locked=latest?.state==='pending'||latest?.state==='approved';
 const finish=(r:Verification|null)=>{if(r&&live.current){setItems(all=>[r,...all.filter(x=>x.id!==r.id)]);setStatement('');setPhotos([]);reload();}};
 const send=()=>{const input={document_asset_ids:[...photos],details:{kind,statement:statement.trim()},...(latest?{previous_request_id:latest.id,expected_version:latest.version}:{})};void mutation.run(k=>manager.submitVerification(owner,id,input,k)).then(finish);};
 const loadPhoto=useCallback(async(asset:string)=>{await sessionReady(manager,owner);if(!live.current)throw new ApiError('CANCELLED');return manager.verificationAsset(owner,asset);},[manager,owner]);
 const uploaded=(a:VerificationAsset|null)=>{if(a&&live.current)setPhotos(ids=>ids.includes(a.id)?ids:[...ids,a.id]);};
 const pick=async()=>{setPicking(true);setError(null);try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(result.canceled||!result.assets[0]||!live.current)return;const chosen=result.assets[0],raw=chosen.file??await(await fetch(chosen.uri)).blob(),blob=raw.type?raw:raw.slice(0,raw.size,chosen.mimeType??'');if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||!blob.size||blob.size>10*1024*1024)throw new ApiError('VALIDATION');uploaded(await upload.run(k=>manager.uploadVerification(owner,blob,k)));}catch(e){if(live.current)setError(e instanceof ApiError?e.code:'NETWORK');}finally{if(live.current)setPicking(false);}};
 return <><AppText variant="section">{t('verification.intro')}</AppText><AppText tone="muted">{t('verification.privacy')}</AppText><RefreshError error={error} busy={blocked} retry={reload}/><Button testID="verification-refresh" label={t('verification.refresh')} variant="secondary" disabled={blocked} onPress={reload}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['identity',...(partnerKind==='company'?['business']:[]),'professional'] as Verification['kind'][]).map(k=><Button key={k} testID={'verification-kind-'+k} label={t(`verification.${k}`)} variant={kind===k?'primary':'secondary'} disabled={blocked} onPress={()=>{setKind(k);setPhotos([]);setStatement('');setMutation(new Mutation<Verification>());}}/>)}</View>
 {loaded&&<Card><AppText testID="verification-state" variant="section">{t(latest?`verification.${latest.state}`:'verification.empty')}</AppText>{latest?.reason&&<AppText>{latest.reason}</AppText>}{locked?<AppText>{t('verification.locked')}</AppText>:<><Input testID="verification-statement" label={t('verification.statement')} value={statement} multiline editable={!blocked} onChangeText={setStatement}/><AppText tone="muted">{t('verification.submitHint')}</AppText>{photos.map(asset=><Card key={asset}><EvidencePhoto id={asset} load={loadPhoto}/><Button label={t('verification.remove')} disabled={blocked} variant="secondary" onPress={()=>setPhotos(ids=>ids.filter(i=>i!==asset))}/></Card>)}<Button testID="verification-pick" label={t('verification.pick')} disabled={blocked||photos.length>=10} variant="secondary" onPress={()=>void pick()}/><Button testID="verification-submit" label={t(latest?'verification.resubmit':'verification.send')} disabled={blocked||!statement.trim()||!photos.length||m.error==='VERSION_CONFLICT'||m.error==='STATE_CONFLICT'} onPress={send}/></>}</Card>}
 <JobFeedback error={u.error} pending={u.pending} busy={u.busy||auth.busy} retry={u.pending?()=>void upload.run().then(uploaded):undefined}/><JobFeedback error={m.error} pending={m.pending} busy={m.busy||auth.busy} retry={m.pending?()=>void mutation.run().then(finish):undefined}/>
 {(m.error==='VERSION_CONFLICT'||m.error==='STATE_CONFLICT')&&<Button label={t('verification.refresh')} disabled={blocked} onPress={()=>{setMutation(new Mutation<Verification>());reload();}}/>}
 <AppText variant="section">{t('verification.history')}</AppText>{items.filter(r=>r.kind===kind).map(r=><Card key={r.id}><AppText>{t(`verification.${r.state}`)} · {formatBusinessDate(new Date(r.created_at),locale)}</AppText><AppText>{r.details.statement}</AppText>{r.document_asset_ids.map(asset=><EvidencePhoto key={asset} id={asset} load={loadPhoto}/>)}{r.history.map((h,i)=><AppText key={i}>{h.reason}</AppText>)}</Card>)}</>;
}
