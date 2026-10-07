import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import type { Locale } from '../../../lib/i18n';
import { validPoint, type Point, type Suggestion } from '../models';
export type LocationsApi = {
  search(action: 'autocomplete' | 'geocode', text: string, locale: Locale, signal: AbortSignal, bias?: Point): Promise<Suggestion[]>;
  reverse(point: Point, locale: Locale, signal: AbortSignal): Promise<Suggestion | null>;
};
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const suggestion = (x: unknown): x is Suggestion => record(x) && typeof x.id === 'string' && typeof x.text === 'string' && !!x.text.trim() && x.text.length <= 1000 && validPoint(x.point) && ['address', 'approximate'].includes(String(x.precision));
export function createLocationsApi(base: string | undefined, transport: typeof fetch = fetch): LocationsApi {
  async function call(action: string, body: unknown, signal: AbortSignal) {
    if (!base || !/^https?:\/\//.test(base)) throw new ApiError('CONFIG');
    return requestJson(base.replace(/\/$/, '') + '/locations/' + action, transport, signal, undefined,
      x => record(x) && typeof x.attribution === 'string' && (action === 'reverse' ? x.address === null || suggestion(x.address) : Array.isArray(x.items) && x.items.length <= 5 && x.items.every(suggestion)), { method: 'POST', body });
  }
  return {
    search: async (action, text, locale, signal, bias) => (await call(action, { text, locale, ...(bias ? { bias } : {}) }, signal) as { items: Suggestion[] }).items,
    reverse: async (point, locale, signal) => (await call('reverse', { point, locale }, signal) as { address: Suggestion | null }).address,
  };
}
export const locationsApi = createLocationsApi(process.env.EXPO_PUBLIC_API_URL);
