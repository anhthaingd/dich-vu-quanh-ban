import type { PartnerCard, Point } from '../../partners/models';
import { validPoint } from '../../location/models';
export type ResultPin = { id: string; point: Point; partners: PartnerCard[] };
export type ResultsMapProps = { center: Point; pins: ResultPin[]; selected: string | null; onSelect: (id: string) => void; onError: () => void; centerLabel: string };
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
