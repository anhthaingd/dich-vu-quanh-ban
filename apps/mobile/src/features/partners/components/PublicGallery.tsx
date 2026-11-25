import {useCallback,useMemo,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Card} from '../../../components/ui/Card';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {EvidencePhoto} from '../../support/screens/EvidencePhoto';
import {createGalleryApi} from '../api/gallery-api';
import {useErrorText} from '../../../components/ui/ErrorMessage';
import {toErrorInfo,type ErrorInfo} from '../../../lib/errors/describe';
export function PublicGallery({id,featured=false}:{id:string;featured?:boolean}){
 const [ids,setIds]=useState<string[]>([]),[failed,setFailed]=useState<ErrorInfo|null>(null),[busy,setBusy]=useState(true),[attempt,setAttempt]=useState(0);
 const {t}=useLocale(),errorText=useErrorText(),api=useMemo(()=>createGalleryApi(process.env.EXPO_PUBLIC_API_URL),[]),load=useCallback((id:string)=>api.asset(id),[api]);
 useFocusEffect(useCallback(()=>{let live=true;setIds([]);setFailed(null);setBusy(true);void api.list(id).then(r=>{if(live)setIds(r.asset_ids);}).catch(e=>{if(live)setFailed(toErrorInfo(e));}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[api,id,attempt]));
 if(featured&&!busy&&!failed&&!ids.length)return null;
 return <Card style={featured?{padding:0,borderWidth:0}:undefined}><AppText variant="section">{t('partners.gallery')}</AppText>{busy?<AppText>{t('accountTools.loading')}</AppText>:failed?<><AppText accessibilityRole="alert" tone="error">{errorText(failed)}</AppText><Button label={t('common.retry')} testID="gallery-public-retry" variant="secondary" onPress={()=>setAttempt(n=>n+1)}/></>:ids.length?ids.map(id=><EvidencePhoto key={id} id={id} load={load}/>):<AppText>{t('partners.galleryEmpty')}</AppText>}</Card>;
}
