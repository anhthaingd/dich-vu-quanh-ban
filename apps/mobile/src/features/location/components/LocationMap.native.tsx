import { useEffect, useRef } from 'react';
import { Map, Camera, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import { initialCenter, mapFeatures, mapStyle, type LocationMapProps } from './map-model';
export function LocationMap({ point, radius, onChoose, onError }: LocationMapProps) {
  const camera = useRef<CameraRef>(null);
  const style = mapStyle();
  useEffect(() => { if (!style) onError(); }, [style, onError]);
  useEffect(() => { if (point) camera.current?.jumpTo({ center: [point.longitude, point.latitude] }); }, [point]);
  if (!style) return null;
  return <Map style={{ flex: 1 }} mapStyle={style} onDidFailLoadingMap={onError}
    onPress={e => { const [longitude, latitude] = e.nativeEvent.lngLat; onChoose?.({ latitude, longitude }); }}
    onRegionDidChange={e => { if (e.nativeEvent.userInteraction) { const [longitude, latitude] = e.nativeEvent.center; onChoose?.({ latitude, longitude }); } }}>
    <Camera ref={camera} initialViewState={{ center: point ? [point.longitude, point.latitude] : initialCenter, zoom: radius ? 11 : 14 }} />
    <GeoJSONSource id="location-choice" data={mapFeatures(point, radius)}>
      <Layer id="location-area" type="fill" filter={['==', ['get', 'kind'], 'area']} paint={{ 'fill-color': '#147d73', 'fill-opacity': 0.18 }} />
      <Layer id="location-area-border" type="line" filter={['==', ['get', 'kind'], 'area']} paint={{ 'line-color': '#147d73', 'line-width': 2 }} />
      <Layer id="location-pin" type="circle" filter={['==', ['get', 'kind'], 'pin']} paint={{ 'circle-radius': 9, 'circle-color': '#147d73', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' }} />
    </GeoJSONSource>
  </Map>;
}
