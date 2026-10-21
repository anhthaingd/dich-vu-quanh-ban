import type { PartnerCard, Point } from '../../partners/models';
import { validPoint } from '../../location/models';
export type ResultPin = { id: string; point: Point; partners: PartnerCard[] };
export type ResultsMapProps = { center: Point; pins: ResultPin[]; selected: string | null; onSelect: (id: string, partners?:PartnerCard[]) => void; onError: () => void; centerLabel: string };
// Exact coincident points share a pin so every provider there remains selectable.
export function resultPins(items: PartnerCard[]): ResultPin[] {
  const groups = new Map<string, ResultPin>();
  for (const p of items) {
    const point = p.map_location?.point;
    if (!point || !validPoint(point)) continue;
    const key = `${point.longitude},${point.latitude}`;
    const pin = groups.get(key) ?? { id: key, point, partners: [] };
    if (!pin.partners.some(x => x.id === p.id)) pin.partners.push(p);
    groups.set(key, pin);
  }
  return [...groups.values()];
}
export function resultBounds(center: Point, pins: ResultPin[]): [number, number, number, number] {
  const points = [center, ...pins.map(p => p.point)];
  const lng = points.map(p => p.longitude), lat = points.map(p => p.latitude);
  return [Math.max(-180, Math.min(...lng) - 0.002), Math.max(-90, Math.min(...lat) - 0.002), Math.min(180, Math.max(...lng) + 0.002), Math.min(90, Math.max(...lat) + 0.002)];
}

// Screen-space grid in Web Mercator. Zooming in splits groups; each provider
// occurs once, and co-located providers remain selectable at maximum zoom.
export function clusterPins(pins:ResultPin[],zoom:number):ResultPin[]{
 const groups=new Map<string,ResultPin>(),scale=512*2**Math.max(0,Math.min(22,zoom));
 for(const pin of pins){const latitude=Math.max(-85.0511,Math.min(85.0511,pin.point.latitude)),s=Math.sin(latitude*Math.PI/180);
  const x=(pin.point.longitude+180)/360*scale,y=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale,key=`cluster:${Math.floor(x/52)}:${Math.floor(y/52)}`;
  const group=groups.get(key);if(group){group.partners.push(...pin.partners.filter(p=>!group.partners.some(q=>q.id===p.id)));}else groups.set(key,{...pin,id:key,partners:[...pin.partners]});
 }
 return [...groups.values()];
}
