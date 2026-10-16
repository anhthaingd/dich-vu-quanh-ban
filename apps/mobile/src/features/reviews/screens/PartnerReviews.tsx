import {useCallback,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {createReviewsApi,type ReviewsApi} from '../api/reviews-api';
import type {Review} from '../models';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {Card} from '../../../components/ui/Card';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {ErrorState} from '../../../components/ui/Feedback';
const defaultApi=createReviewsApi(process.env.EXPO_PUBLIC_API_URL);
export function PartnerReviews({id,api=defaultApi}:{id:string;api?:ReviewsApi}){
 const {t}=useLocale();const [items,setItems]=useState<Review[]>([]),[cursor,setCursor]=useState<string|null>(null),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(false);
 const generation=useRef(0);
 const load=useCallback((page?:string)=>{const request=++generation.current;setBusy(true);setError(false);if(!page){setItems([]);setCursor(null);}
  void api.publicList(id,page).then(p=>{if(request===generation.current){setItems(old=>page?[...old.filter(r=>!p.items.some(v=>v.id===r.id)),...p.items]:p.items);setCursor(p.next_cursor);}}).catch(()=>{if(request===generation.current){setError(true);setItems([]);setCursor(null);}}).finally(()=>{if(request===generation.current)setBusy(false);});
 },[id,api]);
 useFocusEffect(useCallback(()=>{load();return()=>{generation.current++;};},[load,attempt]));
 return <Card><AppText variant="section">{t('reviews.public')}</AppText>{busy&&<AppText>{t('accountTools.loading')}</AppText>}{error?<ErrorState message={t('search.error')} retryLabel={t('common.retry')} onRetry={()=>{setAttempt(n=>n+1);}}/>:items.map(r=><Card key={r.id}><AppText>{t('reviews.score',{stars:r.stars})}</AppText><AppText>{r.body}</AppText></Card>)}{!busy&&!error&&!items.length&&<AppText>{t('reviews.empty')}</AppText>}{cursor&&<Button label={t('accountTools.more')} disabled={busy} onPress={()=>load(cursor)}/>}</Card>;
}
