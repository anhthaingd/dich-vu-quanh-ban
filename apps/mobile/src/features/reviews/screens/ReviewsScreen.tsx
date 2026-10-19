import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import * as ImagePicker from 'expo-image-picker';
import {ReviewPhoto} from './ReviewPhoto';
import {View} from 'react-native';
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
import {JobFeedback} from '../../jobs/components/JobFeedback';
import {Mutation} from '../../jobs/state/mutation';
import {sessionReady} from '../../jobs/state/session-ready';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import type {Review,ReviewAsset} from '../models';
export function ReviewsScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,'Reviews'>){return <AccountPage title="reviews.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account')}>{owner=><Content key={`${owner}:${route.params.id}`} owner={owner} id={route.params.id} report={review=>navigation.navigate('Support',{context:{kind:'review',job_id:route.params.id,review_id:review}})}/>}</AccountPage>;}
function Content({owner,id,report}:{owner:string;id:string;report:(id:string)=>void}){
 const {manager,state:auth}=useAuth(),{t}=useLocale();
 const [items,setItems]=useState<Review[]>([]),[eligible,setEligible]=useState(false),[canWrite,setCanWrite]=useState(false),[direction,setDirection]=useState<Review['direction']>('customer_to_partner');
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null),[attempt,setAttempt]=useState(0);
 const [editing,setEditing]=useState(false),[editVersion,setEditVersion]=useState<number|null>(null),[stars,setStars]=useState(0),[body,setBody]=useState('');
 const mounted=useRef(true),[picking,setPicking]=useState(false),[photoId,setPhotoId]=useState<string|null>(null),[replyDraft,setReplyDraft]=useState<{id:string;version:number;body:string}|null>(null);
 const [upload]=useState(()=>new Mutation<ReviewAsset>()),up=useSyncExternalStore(upload.subscribe,upload.getSnapshot,upload.getSnapshot);
 const [mutation,setMutation]=useState(()=>new Mutation<Review>()),state=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot);
 useEffect(()=>{if(state.error&&['NOT_FOUND','FORBIDDEN','UNAUTHENTICATED'].includes(state.error)){setItems([]);setLoaded(false);setCanWrite(false);setEditing(false);setBody('');setStars(0);setPhotoId(null);setReplyDraft(null);}},[state.error]);
 const blocked=busy||auth.busy||state.pending||up.pending||picking;
 const refresh=useCallback(()=>{setAttempt(v=>v+1);return true;},[]);
 useAccountRefresh(busy,refresh,!blocked);
 useFocusEffect(useCallback(()=>{
  let active=true;mounted.current=true;setBusy(true);setError(null);
  void (async()=>{
   async function read<T>(work:()=>Promise<T>):Promise<T>{
    for(let retries=0;;retries++){
     await sessionReady(manager,owner);if(!active)throw new ApiError('CANCELLED');
     try{return await work();}catch(e){if(!(e instanceof ApiError)||e.code!=='BUSY'||retries>=2)throw e;}
    }
   }
   const job=await read(()=>manager.getJob(owner,id)),invoice=await read(()=>manager.getInvoice(owner,id));
   const customer=job.customer_id===owner;let write=customer;
   if(!customer){let cursor:string|undefined;const seen=new Set<string>();do{const p=await read(()=>manager.myMemberships(owner,cursor));write ||= p.items.some(m=>m.partner_id===job.partner_id&&m.active&&(m.is_owner||m.permissions.includes('reviews.write')));cursor=p.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);}while(cursor&&active);}
   const all:Review[]=[];let cursor:string|undefined;const seen=new Set<string>();
   do{const p=await read(()=>manager.jobReviews(owner,id,cursor));for(const r of p.items){const old=all.findIndex(v=>v.id===r.id);if(old<0)all.push(r);else if(r.version>all[old].version)all[old]=r;}cursor=p.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);}while(cursor&&active);
   if(active){setItems(all);setDirection(customer?'customer_to_partner':'partner_to_customer');setCanWrite(write);setEligible(invoice.review_eligible);setLoaded(true);}
  })().catch(e=>{if(active){const code=e instanceof ApiError?e.code:'NETWORK';setError(code);if(['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(code)){setItems([]);setLoaded(false);setCanWrite(false);setEditing(false);setBody('');setStars(0);setPhotoId(null);setReplyDraft(null);}}}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;mounted.current=false;};
 },[manager,owner,id,attempt]));
 const own=items.find(r=>r.direction===direction),finish=(r:Review|null)=>{if(r&&mounted.current){setItems(all=>[...all.filter(x=>x.id!==r.id),r]);setEditing(false);setBody('');setStars(0);setPhotoId(null);setReplyDraft(null);refresh();}};
 const save=()=>{const input={stars,body,...(photoId?{asset_id:photoId}:own?{asset_id:null}:{}),...(own?{expected_version:editVersion??own.version}:{})};void mutation.run(k=>own?manager.editReview(owner,own.id,input,k):manager.createReview(owner,id,input,k)).then(finish);};
 const loadPhoto=useCallback(async(asset:string)=>{
  for(let retries=0;;retries++){await sessionReady(manager,owner);if(!mounted.current)throw new ApiError('CANCELLED');try{return await manager.getAsset(owner,asset);}catch(e){if(!(e instanceof ApiError)||e.code!=='BUSY'||retries>=2)throw e;}}
 },[manager,owner]);
 const pick=async()=>{setPicking(true);setError(null);try{
  const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
  if(selected.canceled||!selected.assets[0]||!mounted.current)return;
  const chosen=selected.assets[0],raw=chosen.file??await(await fetch(chosen.uri)).blob();
  const blob=raw.type?raw:raw.slice(0,raw.size,chosen.mimeType??'');
  if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||!blob.size||blob.size>10*1024*1024)throw new ApiError('VALIDATION');
  const asset=await upload.run(k=>manager.uploadReview(owner,blob,k));if(asset&&mounted.current)setPhotoId(asset.id);
 }catch(e){if(mounted.current)setError(e instanceof ApiError?e.code:'NETWORK');}finally{if(mounted.current)setPicking(false);}};
 const saveReply=()=>{if(!replyDraft)return;const draft={...replyDraft};void mutation.run(k=>manager.replyReview(owner,draft.id,draft.version,draft.body.trim(),k)).then(finish);};
 const conflict=state.error==='VERSION_CONFLICT'||state.error==='STATE_CONFLICT';
 return <><AppText tone="muted">{t('reviews.privacy')}</AppText><Button testID="reviews-reload" label={t('accountTools.reload')} variant="secondary" disabled={blocked} onPress={()=>{if(state.error==='VERSION_CONFLICT'||state.error==='STATE_CONFLICT'){setMutation(new Mutation<Review>());setEditing(false);setStars(0);setBody('');setPhotoId(null);setReplyDraft(null);}refresh();}}/><JobFeedback error={error}/>{busy&&<AppText>{t('accountTools.loading')}</AppText>}
 {loaded&&!eligible&&<AppText testID="reviews-locked">{t('reviews.locked')}</AppText>}
 {loaded&&items.map(r=><Card key={r.id}><AppText variant="section">{t(r.direction===direction?'reviews.own':'reviews.received')}</AppText><AppText testID={`review-stars-${r.id}`}>{t('reviews.score',{stars:r.stars})}</AppText><AppText>{r.body}</AppText>{r.asset_id&&<ReviewPhoto key={r.asset_id} id={r.asset_id} load={loadPhoto}/>}{r.reply&&<><AppText variant="section">{t('reviews.reply')}</AppText><AppText>{r.reply.body}</AppText></>}{r.hidden&&<AppText>{t('reviews.hidden')}</AppText>}{r.removed&&<AppText>{t('reviews.removed')}</AppText>}{r.moderation_history?.map((h,i)=><Card key={i}><AppText variant="caption">{t('support.team')}</AppText><AppText>{h.reason}</AppText></Card>)}
 <Button testID={`review-report-${r.id}`} label={t('support.title')} disabled={blocked} variant="secondary" onPress={()=>report(r.id)}/>{r.allowed_actions.includes('edit')&&<><Button testID="review-edit" variant="secondary" label={t('reviews.edit')} disabled={blocked} onPress={()=>{setStars(r.stars);setBody(r.body);setEditVersion(r.version);setPhotoId(r.asset_id);setReplyDraft(null);setEditing(true);}}/><Button testID="review-visibility" variant="secondary" label={t(r.removed?'reviews.restore':'reviews.remove')} disabled={blocked} onPress={()=>void mutation.run(k=>manager.reviewVisibility(owner,r.id,r.version,!r.removed,k)).then(finish)}/></>}{r.allowed_actions.includes('reply')&&<Button testID="review-reply-edit" variant="secondary" label={t(r.reply?'reviews.editReply':'reviews.writeReply')} disabled={blocked||conflict} onPress={()=>{setEditing(false);setReplyDraft({id:r.id,version:r.version,body:r.reply?.body??''});}}/>}</Card>)}
 {loaded&&replyDraft&&<Card><Input testID="review-reply-body" label={t('reviews.reply')} multiline value={replyDraft.body} editable={!blocked&&!conflict} onChangeText={body=>setReplyDraft({...replyDraft,body})}/><Button testID="review-reply-save" label={t('reviews.saveReply')} disabled={blocked||conflict||!replyDraft.body.trim()} onPress={saveReply}/><Button label={t('accountTools.cancel')} variant="secondary" disabled={blocked} onPress={()=>setReplyDraft(null)}/></Card>}
 {loaded&&!replyDraft&&eligible&&canWrite&&(!own||editing)&&<Card><AppText variant="section">{t('reviews.experience')}</AppText><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[1,2,3,4,5].map(n=><Button key={n} testID={`review-star-${n}`} label={n<=stars?'★':'☆'} accessibilityLabel={t('reviews.score',{stars:n})} accessibilityState={{selected:stars===n}} variant="secondary" disabled={blocked||conflict} onPress={()=>setStars(n)}/>)}</View><Input testID="review-body" label={t('reviews.body')} multiline value={body} editable={!blocked&&!conflict} onChangeText={setBody}/><AppText>{t('reviews.photo')}</AppText>{photoId&&<><ReviewPhoto key={photoId} id={photoId} load={loadPhoto}/><Button testID="review-photo-remove" label={t('reviews.removePhoto')} variant="secondary" disabled={blocked||conflict} onPress={()=>setPhotoId(null)}/></>}<Button testID="review-photo-pick" label={t('reviews.pickPhoto')} variant="secondary" disabled={blocked||conflict} onPress={()=>void pick()}/><Button testID="review-save" label={t(own?'reviews.save':'reviews.send')} disabled={blocked||!stars||conflict} onPress={save}/>{editing&&<Button label={t('accountTools.cancel')} variant="secondary" disabled={blocked} onPress={()=>setEditing(false)}/>}</Card>}
 {loaded&&eligible&&!canWrite&&<AppText>{t('reviews.readOnly')}</AppText>}
 <JobFeedback error={up.error} pending={up.pending} busy={up.busy||auth.busy} retry={up.pending?()=>void upload.run().then(a=>{if(a&&mounted.current)setPhotoId(a.id);}):undefined}/>
 <JobFeedback error={state.error} pending={state.pending} busy={state.busy||auth.busy} retry={state.pending?()=>void mutation.run().then(finish):undefined}/>
 {conflict&&<AppText>{t('jobs.reloadBeforeRetry')}</AppText>}
 </>;
}
