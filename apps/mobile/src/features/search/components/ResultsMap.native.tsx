import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Map, Camera, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { mapStyle } from '../../location/components/map-model';
import { clusterPins, resultBounds, type ResultsMapProps } from './results-map-model';
export function ResultsMap({center,pins,selected,onSelect,onError,centerLabel}:ResultsMapProps) {
  const [zoom,setZoom]=useState(12);
  const camera=useRef<CameraRef>(null),style=mapStyle();
  const fit=()=>{ camera.current?.fitBounds(resultBounds(center,pins),{padding:{top:40,bottom:40,left:40,right:40},duration:0}); };
  useEffect(()=>{if(!style)onError();},[style,onError]);
  useEffect(fit,[center,pins]);
  if(!style)return null;
  return <Map style={{flex:1}} mapStyle={style} onRegionDidChange={e=>setZoom(e.nativeEvent.zoom)} onDidFailLoadingMap={onError} onDidFinishLoadingMap={fit}>
    <Camera ref={camera} initialViewState={{center:[center.longitude,center.latitude],zoom:12}} maxZoom={18} />
    <Marker id="search-origin" lngLat={[center.longitude,center.latitude]}><View accessibilityLabel={centerLabel} style={{width:16,height:16,borderRadius:8,backgroundColor:'#147d73',borderWidth:3,borderColor:'#fff'}} /></Marker>
    {clusterPins(pins,zoom).map((pin,index)=><Marker key={pin.id} id={pin.id} accessible accessibilityRole="button" accessibilityLabel={pin.partners.map(p=>p.name).join(', ')} testID={`result-pin-${pin.partners[0].id}`} lngLat={[pin.point.longitude,pin.point.latitude]} onPress={()=>onSelect(pin.id,pin.partners)}>
      <View accessibilityRole="button" accessibilityLabel={pin.partners.map(p=>p.name).join(', ')} style={{minWidth:36,height:36,borderRadius:18,justifyContent:'center',alignItems:'center',paddingHorizontal:7,borderWidth:3,borderColor:'#fff',backgroundColor:selected===pin.id?'#102b4e':'#2455dc'}}>
        <Text style={{color:'#fff',fontWeight:'700'}}>{pin.partners.length>1?`${pin.partners.length}×`:String(index+1)}</Text>
      </View>
    </Marker>)}
  </Map>;
}
