import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { object, identifier, pageInput } from '../accounts/accounts.input.js';
import type { Mode } from '../partners/partners.input.js';
import { invalid, reasoned } from '../partners/partners.errors.js';
export function searchInput(value: Record<string, unknown>) {
  // Unknown filter names are user input: never echo them back as `field`.
  const v = reasoned(() => object(value, [
    'latitude',
    'longitude',
    'radius_m',
    'skill_id',
    'category_id',
    'service_mode',
    'verified',
    'sort',
    'cursor',
    'limit'
  ]), 'SEARCH_FILTER_UNKNOWN');
  const repeated = Object.keys(v).find((k) => typeof v[k] !== 'string');
  if (repeated !== undefined)
    throw invalid('SEARCH_FILTER_REPEATED', repeated);
  const number = (v: unknown, min: number, max: number, reason: string, field: string) => {
    if (
      typeof v !== 'string' ||
      !/^-?\d+(\.\d+)?$/.test(v) ||
      !Number.isFinite(+v) ||
      +v < min ||
      +v > max
    )
      throw invalid(reason, field);
    return +v;
  };
  const latitude = number(v.latitude, -90, 90, 'SEARCH_LOCATION_INVALID', 'latitude'),
    longitude = number(v.longitude, -180, 180, 'SEARCH_LOCATION_INVALID', 'longitude');
  const radius = number(v.radius_m ?? '10000', 1, 2147483647, 'SEARCH_RADIUS_INVALID', 'radius_m');
  if (!Number.isInteger(radius)) throw invalid('SEARCH_RADIUS_INVALID', 'radius_m');
  if (v.sort !== undefined && !['distance','rating','recommended'].includes(String(v.sort)))
    throw invalid('SEARCH_SORT_INVALID', 'sort');
  if (v.verified !== undefined && v.verified !== 'true' && v.verified !== 'false')
    throw invalid('SEARCH_VERIFIED_INVALID', 'verified');
  if (v.service_mode !== undefined && !['at_shop', 'at_customer', 'custom'].includes(String(v.service_mode)))
    throw invalid('SEARCH_SERVICE_MODE_INVALID', 'service_mode');
  return {
    sort:(v.sort??'distance') as 'distance'|'rating'|'recommended',
    latitude,
    longitude,
    radius,
    skill: v.skill_id === undefined ? null : identifier(v.skill_id, 'SEARCH_SKILL_INVALID', 'skill_id'),
    category: v.category_id === undefined ? null : identifier(v.category_id, 'SEARCH_CATEGORY_INVALID', 'category_id'),
    mode: (v.service_mode ?? null) as Mode | null,
    verified: v.verified === 'true',
    ...pageInput({
      ...(v.limit === undefined ? {} : { limit: v.limit }),
      ...(v.cursor === undefined ? {} : { cursor: v.cursor })
    })
  };
}
export type SearchQuery = ReturnType<typeof searchInput>;
type Position = { snapshot?:string;offset?:number; distance_m: number; created_at: string; id: string };
export class SearchCursor {
  constructor(private readonly secret: string) {}
  private scope(q: SearchQuery) {
    const filter = {
      sort:q.sort,
      latitude: q.latitude,
      longitude: q.longitude,
      radius: q.radius,
      skill: q.skill,
      category: q.category,
      mode: q.mode,
      verified: q.verified
    };
    return createHash('sha256').update(JSON.stringify(filter)).digest('hex');
  }
  private sign(body: string) {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
  encode(p: Position, q: SearchQuery) {
    const body = Buffer.from(
      JSON.stringify({ ...p, scope: this.scope(q) })
    ).toString('base64url');
    return `${body}.${this.sign(body)}`;
  }
  decode(q: SearchQuery): Position | null {
    if (!q.cursor) return null;
    try {
      const [body, signature, extra] = q.cursor.split('.');
      if (!body || !signature || extra) throw new Error();
      const expected = Buffer.from(this.sign(body)),
        actual = Buffer.from(signature);
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      )
        throw new Error();
      const p = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (
        p.scope !== this.scope(q) ||
        typeof p.distance_m !== 'number' ||
        !Number.isFinite(p.distance_m) ||
        p.distance_m < 0 ||
        typeof p.created_at !== 'string' ||
        !Number.isFinite(Date.parse(p.created_at))
      )
        throw new Error();
      if(p.snapshot!==undefined){identifier(p.snapshot);if(!Number.isSafeInteger(p.offset)||p.offset<0)throw new Error();}
      return {
        snapshot:p.snapshot,offset:p.offset,
        distance_m: p.distance_m,
        created_at: p.created_at,
        id: identifier(p.id)
      };
    } catch {
      throw invalid('CURSOR_INVALID', 'cursor');
    }
  }
}
