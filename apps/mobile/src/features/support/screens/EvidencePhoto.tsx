import {useCallback,useState} from 'react';
import {Image} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {Button} from '../../../components/ui/Button';
import {AppText} from '../../../components/ui/AppText';
import type {EvidenceAsset} from '../api/support-api';
export function EvidencePhoto({id,load}:{id:string;load:(id:string)=>Promise<EvidenceAsset>}){
 const {t}=useLocale();const [url,setUrl]=useState<string|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useFocusEffect(useCallback(()=>{let active=true;setUrl(null);setError(false);
  void load(id).then(a=>{if(active){setUrl(a.download_url);setError(!a.download_url);}}).catch(()=>{if(active){setUrl(null);setError(true);}});
  return()=>{active=false;};
 },[id,load,attempt]));
 return error?<Button testID="evidence-retry" variant="secondary" label={t('support.retryPhoto')} onPress={()=>setAttempt(n=>n+1)}/>:url?<Image testID="evidence-photo" accessibilityLabel={t('support.photo')} source={{uri:url}} resizeMode="contain" style={{width:'100%',height:180,borderRadius:12}} onError={()=>{setUrl(null);setError(true);}}/>:<AppText tone="muted">{t('accountTools.loading')}</AppText>;
}
