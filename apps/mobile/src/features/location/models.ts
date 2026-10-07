import type { Point } from '../partners/models';
export type { Point };
export type LocationValue = { text: string; point: Point; source: 'search' | 'map' | 'gps' | 'saved' | 'manual' };
export type Suggestion = Omit<LocationValue, 'source'> & { id: string; precision: 'address' | 'approximate' };
export const validPoint = (p: unknown): p is Point => !!p && typeof p === 'object' && 'latitude' in p && 'longitude' in p && typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
export const pointFromText = (lat: string, lng: string): Point | null => {
  const p = { latitude: lat.trim() ? Number(lat) : NaN, longitude: lng.trim() ? Number(lng) : NaN };
  return validPoint(p) ? p : null;
};
