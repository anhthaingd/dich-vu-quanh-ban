import {useCallback,useEffect,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import {sessionReady} from '../../jobs/state/session-ready';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import type {CustomerReview} from '../models';
export function CustomerReviews({owner,job}:{owner:string;job:string}){
 const {manager}=useAuth(),{t,locale}=useLocale();
 const [items,setItems]=useState<CustomerReview[]>([]),[cursor,setCursor]=useState<string|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null);
 const generation=useRef(0),loading=useRef<number|null>(null);
 useEffect(()=>()=>{generation.current++;},[]);
 const load=useCallback(async(after?:string)=>{const current=generation.current;if(loading.current===current)return;loading.current=current;setBusy(true);setError(null);try{
  await sessionReady(manager,owner);const page=await manager.customerReviews(owner,job,after);
  if(current===generation.current){setItems(old=>after?[...old,...page.items.filter(r=>!old.some(v=>v.id===r.id))]:page.items);setCursor(page.next_cursor);}
 }catch(e){if(current===generation.current){setItems([]);setCursor(null);setError(e instanceof ApiError?e.code:'NETWORK');}}finally{if(loading.current===current)loading.current=null;if(current===generation.current)setBusy(false);}},[manager,owner,job]);
 useFocusEffect(useCallback(()=>{if(open)void load();return()=>{generation.current++;};},[open,load]));
 useRealtimeRefresh({busy,error,matches:s=>s.kind==='event'&&s.event.type==='review.updated.v1',refresh:()=>{if(open)void load();},revoke:()=>{setItems([]);setCursor(null);}});
 return <Card><Button testID="customer-reviews-open" label={t('reviews.customerHistory')} variant="secondary" onPress={()=>setOpen(v=>!v)}/>{open&&<><AppText tone="muted">{t('reviews.customerHistoryHint')}</AppText><JobFeedback error={error} retry={()=>void load()} busy={busy}/>{!busy&&!error&&!items.length&&<AppText>{t('reviews.empty')}</AppText>}{items.map(r=><Card key={r.id}><AppText>{t('reviews.score',{stars:r.stars})}</AppText><AppText>{r.body}</AppText>{r.reply&&<><AppText>{t('reviews.reply')}</AppText><AppText>{r.reply}</AppText></>}<AppText variant="caption">{new Date(r.created_at).toLocaleDateString(locale,{timeZone:'Asia/Ho_Chi_Minh'})}</AppText></Card>)}{cursor&&<Button label={t('invoice.more')} disabled={busy} onPress={()=>void load(cursor)}/>}</>}</Card>;
}
