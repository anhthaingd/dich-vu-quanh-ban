import {
  requestJson,
  type JsonRequestOptions
} from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import { isPage, type Page } from '../../accounts/models';
import type {
  Partner,
  PartnerCard,
  PartnerCreate,
  PartnerEdit,
  PartnerProfile,
  SearchInput
} from '../models';
import type { Locale } from '../../../lib/i18n';
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === 'string';
const uuid = (x: unknown) =>
  text(x) &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(x);
const amount = (x: unknown) =>
  x === null || (text(x) && /^(0|[1-9]\d*)$/.test(x));
const point = (x: unknown) =>
  record(x) &&
  typeof x.latitude === 'number' &&
  Number.isFinite(x.latitude) &&
  Math.abs(x.latitude) <= 90 &&
  typeof x.longitude === 'number' &&
  Number.isFinite(x.longitude) &&
  Math.abs(x.longitude) <= 180;
const address = (x: unknown) => record(x) && text(x.text) && point(x.point);
const base = (x: unknown): x is Record<string, unknown> =>
  record(x) &&
  uuid(x.id) &&
  text(x.name) &&
  ['solo', 'shop', 'company'].includes(String(x.kind)) &&
  ['unverified', 'pending', 'verified', 'rejected'].includes(
    String(x.verification_status)
  );
export const isPartner = (x: unknown): x is Partner =>
  base(x) &&
  text(x.bio) &&
  text(x.phone) &&
  text(x.zalo) &&
  Number.isSafeInteger(x.version) &&
  Number(x.version) > 0 &&
  ['draft', 'published'].includes(String(x.publication_status)) &&
  ['active', 'new_work_suspended', 'suspended'].includes(
    String(x.moderation_status)
  ) &&
  typeof x.accepting_jobs === 'boolean' &&
  Array.isArray(x.skills) &&
  x.skills.every(
    (s) =>
      record(s) &&
      uuid(s.skill_id) &&
      Array.isArray(s.modes) &&
      s.modes.length > 0 &&
      s.modes.every((m) =>
        ['at_shop', 'at_customer', 'custom'].includes(String(m))
      ) &&
      amount(s.reference_labor) &&
      amount(s.inspection_fee) &&
      amount(s.travel_fee)
  ) &&
  Array.isArray(x.areas) &&
  x.areas.every(
    (a) =>
      record(a) &&
      text(a.label) &&
      point(a.center) &&
      ((a.radius_m===null&&a.boundary_geojson!==null)||Number.isSafeInteger(a.radius_m)&&Number(a.radius_m)>0) &&
      (a.boundary_geojson === null||record(a.boundary_geojson)&&a.boundary_geojson.type==='MultiPolygon'&&Array.isArray(a.boundary_geojson.coordinates))
  ) &&
  Array.isArray(x.locations) &&
  x.locations.every(
    (l) => record(l) && address(l.address) && typeof l.public === 'boolean'
  );
export const isCard = (x: unknown): x is PartnerCard =>
  base(x) &&
  (x.map_location === null || address(x.map_location)) &&
  typeof x.distance_m === 'number' &&
  Number.isFinite(x.distance_m) &&
  x.distance_m >= 0 &&
  ['shop', 'service_area'].includes(String(x.distance_kind)) &&
  (x.stars === null ||
    (typeof x.stars === 'number' && x.stars >= 1 && x.stars <= 5)) &&
  Number.isSafeInteger(x.review_count) &&
  Number(x.review_count) >= 0 &&
  amount(x.reference_labor);
export const isProfile = (x: unknown): x is PartnerProfile =>
  base(x) &&
  text(x.bio) &&
  Array.isArray(x.skills) &&
  x.skills.every(
    (s) =>
      record(s) &&
      uuid(s.id) &&
      text(s.name) &&
      text(s.name_vi) &&
      text(s.code) &&
      ['vi', 'en', 'ja'].includes(String(s.name_locale)) &&
      Number.isSafeInteger(s.schema_version) &&
      record(s.form_schema) &&
      Array.isArray(s.category_ids) &&
      s.category_ids.every(uuid)
  ) &&
  Array.isArray(x.public_locations) && x.public_locations.every(l=>record(l)&&uuid(l.id)&&address(l.address)) &&
  Array.isArray(x.service_modes) && x.service_modes.every(s=>record(s)&&uuid(s.skill_id)&&Array.isArray(s.modes)&&s.modes.every(m=>['at_shop','at_customer','custom'].includes(String(m)))) &&
  Array.isArray(x.public_addresses) &&
  x.public_addresses.every(address) &&
  typeof x.can_hire === 'boolean' &&
  typeof x.can_message === 'boolean' &&
  (x.contact === null ||
    (record(x.contact) &&
      (x.contact.phone === undefined || text(x.contact.phone)) &&
      (x.contact.zalo === undefined || text(x.contact.zalo))));
export interface PartnersApi {
  create(token: string, input: PartnerCreate, key: string): Promise<Partner>;
  management(token: string, id: string): Promise<Partner>;
  edit(
    token: string,
    id: string,
    input: PartnerEdit,
    key: string
  ): Promise<Partner>;
  profile(
    id: string,
    locale: Locale,
    signal?: AbortSignal,
    token?: string
  ): Promise<PartnerProfile>;
  search(
    input: SearchInput,
    cursor?: string,
    signal?: AbortSignal
  ): Promise<Page<PartnerCard>>;
}
export function createPartnersApi(
  baseUrl: string | undefined,
  transport: typeof fetch = fetch
): PartnersApi {
  async function call<T>(
    path: string,
    validate: (x: unknown) => x is T,
    options: JsonRequestOptions = {},
    token?: string,
    key?: string,
    signal?: AbortSignal
  ): Promise<T> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new ApiError('CONFIG');
    return (await requestJson(
      baseUrl.replace(/\/$/, '') + '/partners' + path,
      transport,
      signal,
      undefined,
      validate,
      {
        ...options,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(key ? { 'Idempotency-Key': key } : {})
        }
      }
    )) as T;
  }
  return {
    create: (token, input, key) =>
      call('', isPartner, { method: 'POST', body: input }, token, key),
    management: (token, id) =>
      call(`/${encodeURIComponent(id)}/management`, isPartner, {}, token),
    edit: (token, id, input, key) => {
      const { action, ...body } = input;
      return call(
        `/${encodeURIComponent(id)}/${action}`,
        isPartner,
        { method: 'PUT', body },
        token,
        key
      );
    },
    profile: (id, locale, signal, token) =>
      call(
        `/${encodeURIComponent(id)}?locale=${locale}`,
        isProfile,
        {},
        token,
        undefined,
        signal
      ),
    search: (input, cursor, signal) => {
      const params = new URLSearchParams({ sort: 'distance', limit: '20' });
      for (const [k, v] of Object.entries(input))
        if (v !== undefined) params.set(k, String(v));
      if (cursor) params.set('cursor', cursor);
      return call(
        '?' + params,
        isPage(isCard),
        {},
        undefined,
        undefined,
        signal
      );
    }
  };
}
