import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { PartnerCard, Point } from '../../partners/models';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LocationAttribution } from '../../location/components/LocationAttribution';
import { ResultsMap } from './ResultsMap';
import { resultPins } from './results-map-model';
export function SearchResultsMap({items,center,hasMore,openProfile}:{items:PartnerCard[];center:Point;hasMore:boolean;openProfile:(id:string)=>void}) {
  const {t}=useLocale(),pins=useMemo(()=>resultPins(items),[items]);
  const [selected,setSelected]=useState<string|null>(null),[failed,setFailed]=useState(false),[version,setVersion]=useState(0);
  const [selectedPartners,setSelectedPartners]=useState<PartnerCard[]>([]);
  useEffect(()=>{setSelected(null);setSelectedPartners([]);},[items]);
  const onError=useCallback(()=>setFailed(true),[]);
  const count=pins.reduce((n,p)=>n+p.partners.length,0);
  return <View style={{gap:12}} testID="search-results-map">
    <AppText>{t('searchMap.summary',{mapped:count,total:items.length})}</AppText>
    <AppText tone="muted">{t('searchMap.legend')}</AppText>
    <View style={{height:340,borderRadius:16,overflow:'hidden'}}>
      <ResultsMap key={version} center={center} pins={pins} selected={selected} onSelect={(id,partners)=>{setSelected(id);setSelectedPartners(partners??pins.find(p=>p.id===id)?.partners??[]);}} onError={onError} centerLabel={t('searchMap.origin')} />
    </View>
    <LocationAttribution />
    {failed&&<><AppText tone="error">{t('searchMap.error')}</AppText><Button label={t('common.retry')} onPress={()=>{setFailed(false);setVersion(v=>v+1);}} /></>}
    {count<items.length&&<AppText>{t('searchMap.unmapped',{count:items.length-count})}</AppText>}
    {hasMore&&<AppText>{t('searchMap.more')}</AppText>}
    {selectedPartners.map(p=><Card key={p.id} testID={`map-selected-${p.id}`}>
      <AppText variant="section">{p.name}</AppText><AppText>{p.map_location?.text}</AppText>
      <AppText tone="muted">{t('searchMap.publicPoint')}</AppText>
      <Button label={t('search.view')} onPress={()=>openProfile(p.id)} />
    </Card>)}
  </View>;
}
