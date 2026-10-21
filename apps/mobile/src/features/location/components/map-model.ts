import type { FeatureCollection } from 'geojson';
import type { Point } from '../models';
export type LocationMapProps = { point: Point | null; radius?: number; polygon?:number[][]; clickOnly?:boolean; onChoose?: (point: Point) => void; onError: () => void };
export const mapStyle = () => {
  const key = process.env.EXPO_PUBLIC_GEOAPIFY_MAPS_KEY?.trim();
  return key ? `https://maps.geoapify.com/v1/styles/osm-carto/style.json?apiKey=${encodeURIComponent(key)}` : null;
};
// This is only a camera position; it never becomes a selected location automatically.
export const initialCenter: [number, number] = [105.852, 21.028];
export function mapFeatures(point: Point | null, radius?: number,polygon?:number[][]): FeatureCollection {
  if (!point) return { type: 'FeatureCollection', features: [] };
  const features: FeatureCollection['features'] = [{ type: 'Feature', properties: { kind: 'pin' }, geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] } }];
  if (radius && Number.isFinite(radius) && radius > 0) {
    const lat = point.latitude * Math.PI / 180, lng = point.longitude * Math.PI / 180, angle = Math.min(radius, 20000000) / 6371008.8;
    const ring = Array.from({ length: 65 }, (_, i) => {
      const bearing = 2 * Math.PI * i / 64;
      const y = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
      const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(y));
      return [x * 180 / Math.PI, y * 180 / Math.PI];
    });
    ring[64] = ring[0];
    features.unshift({ type: 'Feature', properties: { kind: 'area' }, geometry: { type: 'Polygon', coordinates: [ring] } });
  }
  if(polygon?.length){const coordinates=polygon.length>=3?[...polygon,polygon[0]]:polygon;features.push({type:'Feature',properties:{kind:'area'},geometry:polygon.length>=3?{type:'Polygon',coordinates:[coordinates]}:{type:'LineString',coordinates}});for(const coordinates of polygon)features.push({type:'Feature',properties:{kind:'pin'},geometry:{type:'Point',coordinates}});}
  return { type: 'FeatureCollection', features };
}
