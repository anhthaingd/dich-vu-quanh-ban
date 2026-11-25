import { BadRequestException } from '@nestjs/common';
import { uuid } from '../../logging/sanitize.js';
// Shared request parsers. Each rejection names a static `reason` (and the
// `field` at fault where known) so the app can say exactly what went wrong.
const invalid = (reason: string, field?: string) => new BadRequestException({ reason, ...(field ? { field } : {}) });
export function identifier(value: unknown, reason: string = 'ID_INVALID', field?: string): string {
  // Guard: `ids.map(identifier)` passes (value, index, array).
  if (typeof value !== 'string' || !uuid.test(value)) throw invalid(typeof reason === 'string' ? reason : 'ID_INVALID', typeof field === 'string' ? field : undefined);
  return value.toLowerCase();
}
/** Idempotency-Key header: missing or not a UUID. */
export const idempotencyKey = (value: unknown) => identifier(value, 'IDEMPOTENCY_KEY_REQUIRED');
/** Body/query must be a plain object with only the allowed keys (app and API out of step). */
export function object(value: unknown, allowed: string[], field?: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw invalid('REQUEST_SHAPE_INVALID', field);
  return value as Record<string, unknown>;
}
export function emptyBody(value: unknown) { if (value !== undefined) object(value, []); }
export function pageInput(query: Record<string, unknown>) {
  object(query, ['limit', 'cursor']);
  const { limit = '20', cursor } = query;
  if (typeof limit !== 'string' || !/^\d+$/.test(limit) || +limit < 1 || +limit > 100) throw invalid('LIMIT_INVALID', 'limit');
  if (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 1024)) throw invalid('CURSOR_INVALID', 'cursor');
  return { limit: +limit, cursor: cursor as string | undefined };
}
export type PageInput = ReturnType<typeof pageInput>;
export type AddressInput = { label: string; address: { text: string; point: { latitude: number; longitude: number } }; is_default: boolean; expected_version?: number };
export function addressInput(value: unknown, edit: boolean): AddressInput {
  const v = object(value, ['label', 'address', 'is_default', ...(edit ? ['expected_version'] : [])]);
  const a = object(v.address, ['text', 'point'], 'address'), p = object(a.point, ['latitude', 'longitude'], 'address.point');
  const text = (v: unknown, reason: string, field: string) => {
    if (typeof v !== 'string' || !v.trim() || Array.from(v).some(c => c.charCodeAt(0) < 32)) throw invalid(reason, field);
    return v.trim();
  };
  if (typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90) throw invalid('ADDRESS_POINT_INVALID', 'address.point.latitude');
  if (typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) throw invalid('ADDRESS_POINT_INVALID', 'address.point.longitude');
  if (typeof v.is_default !== 'boolean') throw invalid('ADDRESS_DEFAULT_INVALID', 'is_default');
  if (edit && (!Number.isSafeInteger(v.expected_version) || Number(v.expected_version) < 1)) throw invalid('EXPECTED_VERSION_REQUIRED', 'expected_version');
  return { label: text(v.label, 'ADDRESS_LABEL_INVALID', 'label'), address: { text: text(a.text, 'ADDRESS_TEXT_INVALID', 'address.text'), point: { latitude: p.latitude, longitude: p.longitude } }, is_default: v.is_default,
    ...(edit ? { expected_version: v.expected_version as number } : {}) };
}
