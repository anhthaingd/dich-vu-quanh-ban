import { useEffect, useRef } from 'react';
import { Map, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initialCenter, mapFeatures, mapStyle, type LocationMapProps } from './map-model';
export function LocationMap(props: LocationMapProps) {
  const host = useRef<HTMLDivElement>(null), map = useRef<Map | null>(null), latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const style = mapStyle();
    if (!host.current || !style) { latest.current.onError(); return; }
    let instance: Map;
    try { instance = new Map({ container: host.current, style, center: latest.current.point ? [latest.current.point.longitude, latest.current.point.latitude] : initialCenter, zoom: latest.current.radius ? 11 : 14, attributionControl: { compact: true } }); }
    catch { latest.current.onError(); return; }
    map.current = instance;
    instance.on('error', () => latest.current.onError());
    instance.on('load', () => {
      instance.addSource('choice', { type: 'geojson', data: mapFeatures(latest.current.point, latest.current.radius,latest.current.polygon) });
      instance.addLayer({ id: 'area', type: 'fill', source: 'choice', filter: ['==', ['get', 'kind'], 'area'], paint: { 'fill-color': '#147d73', 'fill-opacity': 0.18 } });
      instance.addLayer({ id: 'area-border', type: 'line', source: 'choice', filter: ['==', ['get', 'kind'], 'area'], paint: { 'line-color': '#147d73', 'line-width': 2 } });
      instance.addLayer({ id: 'pin', type: 'circle', source: 'choice', filter: ['==', ['get', 'kind'], 'pin'], paint: { 'circle-radius': 9, 'circle-color': '#147d73', 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
    });
    instance.on('click', e => latest.current.onChoose?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
    instance.on('moveend', e => { if (e.originalEvent&&!latest.current.clickOnly) { const p = instance.getCenter(); latest.current.onChoose?.({ latitude: p.lat, longitude: p.lng }); } });
    const resize = new ResizeObserver(() => instance.resize()); resize.observe(host.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const instance = map.current;
    (instance?.getSource('choice') as GeoJSONSource | undefined)?.setData(mapFeatures(props.point, props.radius,props.polygon));
    if (props.point&&!props.clickOnly) instance?.jumpTo({ center: [props.point.longitude, props.point.latitude] });
  }, [props.point, props.radius,props.polygon]);
  return <div ref={host} style={{ width: '100%', height: '100%', minHeight: 240 }} />;
}
