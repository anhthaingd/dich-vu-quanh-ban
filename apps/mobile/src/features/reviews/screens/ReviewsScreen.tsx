import {useCallback,useEffect,useState,useSyncExternalStore} from 'react';
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
import type {Review} from '../models';
export function ReviewsScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,'Reviews'>){return <AccountPage title="reviews.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account')}>{owner=><Content key={`${owner}:${route.params.id}`} owner={owner} id={route.params.id}/>}</AccountPage>;}
function Content({owner,id}:{owner:string;id:string}){
 const {manager,state:auth}=useAuth(),{t}=useLocale();
 const [items,setItems]=useState<Review[]>([]),[eligible,setEligible]=useState(false),[canWrite,setCanWrite]=useState(false),[direction,setDirection]=useState<Review['direction']>('customer_to_partner');
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null),[attempt,setAttempt]=useState(0);
 const [editing,setEditing]=useState(false),[editVersion,setEditVersion]=useState<number|null>(null),[stars,setStars]=useState(0),[body,setBody]=useState('');
 const [mutation,setMutation]=useState(()=>new Mutation<Review>()),state=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot);
 useEffect(()=>{if(state.error&&['NOT_FOUND','FORBIDDEN','UNAUTHENTICATED'].includes(state.error)){setItems([]);setLoaded(false);setCanWrite(false);setEditing(false);setBody('');setStars(0);}},[state.error]);
 const blocked=busy||auth.busy||state.pending;
 const refresh=useCallback(()=>{setAttempt(v=>v+1);return true;},[]);
 useAccountRefresh(busy,refresh,!blocked);
 useFocusEffect(useCallback(()=>{
  let active=true;setBusy(true);setError(null);
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
  })().catch(e=>{if(active){const code=e instanceof ApiError?e.code:'NETWORK';setError(code);if(['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(code)){setItems([]);setLoaded(false);setCanWrite(false);setEditing(false);setBody('');setStars(0);}}}).finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[manager,owner,id,attempt]));
 const own=items.find(r=>r.direction===direction),finish=(r:Review|null)=>{if(r){setItems(all=>[...all.filter(x=>x.id!==r.id),r]);setEditing(false);setBody('');setStars(0);refresh();}};
 const save=()=>{const input={stars,body,...(own?{expected_version:editVersion??own.version}:{})};void mutation.run(k=>own?manager.editReview(owner,own.id,input,k):manager.createReview(owner,id,input,k)).then(finish);};
 const conflict=state.error==='VERSION_CONFLICT'||state.error==='STATE_CONFLICT';
 return <><AppText tone="muted">{t('reviews.privacy')}</AppText><Button testID="reviews-reload" label={t('accountTools.reload')} variant="secondary" disabled={blocked} onPress={()=>{if(state.error==='VERSION_CONFLICT'||state.error==='STATE_CONFLICT'){setMutation(new Mutation<Review>());setEditing(false);setStars(0);setBody('');}refresh();}}/><JobFeedback error={error}/>{busy&&<AppText>{t('accountTools.loading')}</AppText>}
 {loaded&&!eligible&&<AppText testID="reviews-locked">{t('reviews.locked')}</AppText>}
 {loaded&&items.map(r=><Card key={r.id}><AppText variant="section">{t(r.direction===direction?'reviews.own':'reviews.received')}</AppText><AppText testID={`review-stars-${r.id}`}>{t('reviews.score',{stars:r.stars})}</AppText><AppText>{r.body}</AppText>{r.hidden&&<AppText>{t('reviews.hidden')}</AppText>}{r.removed&&<AppText>{t('reviews.removed')}</AppText>}
 {r.author_id===owner&&canWrite&&<><Button testID="review-edit" variant="secondary" label={t('reviews.edit')} disabled={blocked} onPress={()=>{setStars(r.stars);setBody(r.body);setEditVersion(r.version);setEditing(true);}}/><Button testID="review-visibility" variant="secondary" label={t(r.removed?'reviews.restore':'reviews.remove')} disabled={blocked} onPress={()=>void mutation.run(k=>manager.reviewVisibility(owner,r.id,r.version,!r.removed,k)).then(finish)}/></>}</Card>)}
 {loaded&&eligible&&canWrite&&(!own||editing)&&<Card><AppText variant="section">{t('reviews.experience')}</AppText><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[1,2,3,4,5].map(n=><Button key={n} testID={`review-star-${n}`} label={n<=stars?'★':'☆'} accessibilityLabel={t('reviews.score',{stars:n})} accessibilityState={{selected:stars===n}} variant="secondary" disabled={blocked||conflict} onPress={()=>setStars(n)}/>)}</View><Input testID="review-body" label={t('reviews.body')} multiline value={body} editable={!blocked&&!conflict} onChangeText={setBody}/><Button testID="review-save" label={t(own?'reviews.save':'reviews.send')} disabled={blocked||!stars||conflict} onPress={save}/>{editing&&<Button label={t('accountTools.cancel')} variant="secondary" disabled={blocked} onPress={()=>setEditing(false)}/>}</Card>}
 {loaded&&eligible&&!canWrite&&<AppText>{t('reviews.readOnly')}</AppText>}
 <JobFeedback error={state.error} pending={state.pending} busy={state.busy||auth.busy} retry={state.pending?()=>void mutation.run().then(finish):undefined}/>
 {conflict&&<AppText>{t('jobs.reloadBeforeRetry')}</AppText>}
 </>;
}
