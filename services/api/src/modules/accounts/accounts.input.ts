import { BadRequestException } from '@nestjs/common';
import { uuid } from '../../logging/sanitize.js';
export function identifier(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new BadRequestException();
  return value.toLowerCase();
}
export function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new BadRequestException();
  return value as Record<string, unknown>;
}
export function emptyBody(value: unknown) { if (value !== undefined) object(value, []); }
export function pageInput(query: Record<string, unknown>) {
  object(query, ['limit', 'cursor']);
  const { limit = '20', cursor } = query;
  if (typeof limit !== 'string' || !/^\d+$/.test(limit) || +limit < 1 || +limit > 100 || (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 1024))) throw new BadRequestException();
  return { limit: +limit, cursor: cursor as string | undefined };
}
export type PageInput = ReturnType<typeof pageInput>;
export type AddressInput = { label: string; address: { text: string; point: { latitude: number; longitude: number } }; is_default: boolean; expected_version?: number };
export function addressInput(value: unknown, edit: boolean): AddressInput {
  const v = object(value, ['label', 'address', 'is_default', ...(edit ? ['expected_version'] : [])]);
  const a = object(v.address, ['text', 'point']), p = object(a.point, ['latitude', 'longitude']);
  const text = (v: unknown) => {
    if (typeof v !== 'string' || !v.trim() || Array.from(v).some(c => c.charCodeAt(0) < 32)) throw new BadRequestException();
    return v.trim();
  };
  if (typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180
    || typeof v.is_default !== 'boolean' || (edit && (!Number.isSafeInteger(v.expected_version) || Number(v.expected_version) < 1))) throw new BadRequestException();
  return { label: text(v.label), address: { text: text(a.text), point: { latitude: p.latitude, longitude: p.longitude } }, is_default: v.is_default,
    ...(edit ? { expected_version: v.expected_version as number } : {}) };
}
