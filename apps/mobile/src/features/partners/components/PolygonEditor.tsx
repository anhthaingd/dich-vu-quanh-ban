import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {LocationMap} from '../../location/components/LocationMap';
import {LocationAttribution} from '../../location/components/LocationAttribution';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {useLocale} from '../../../app/providers/LocaleProvider';
import type {Point} from '../models';
export function PolygonEditor({center,points,onChange,disabled}:{center:Point|null;points:number[][]|null;onChange:(p:number[][]|null)=>void;disabled:boolean}){
 const {t}=useLocale(),[error,setError]=useState(false),onError=useCallback(()=>setError(true),[]);
 return <View style={{gap:12}}><Button label={t(points?'partners.circleArea':'partners.polygonArea')} variant="secondary" disabled={disabled} onPress={()=>onChange(points?null:[])}/>{points&&<><AppText>{t('partners.polygonHint')}</AppText>{center?<View style={{height:300}}><LocationMap point={center} polygon={points} clickOnly onError={onError} onChoose={disabled?undefined:p=>{if(points.length<100)onChange([...points,[p.longitude,p.latitude]]);}}/></View>:<AppText>{t('partners.chooseRepresentative')}</AppText>}<LocationAttribution/>{error&&<AppText tone="error">{t('searchMap.error')}</AppText>}<AppText>{t('partners.vertices',{count:points.length})}</AppText><Button label={t('partners.undoVertex')} disabled={disabled||!points.length} onPress={()=>onChange(points.slice(0,-1))}/></>}</View>;
}
