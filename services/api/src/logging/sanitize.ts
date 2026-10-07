export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const routes = ['/v1/locations/autocomplete', '/v1/locations/geocode', '/v1/locations/reverse', '/v1/partners', '/v1/partners/:id', ...['management','profile','skills','service-areas','locations','publication','availability'].map(action => `/v1/partners/:id/${action}`), '/v1/categories', '/v1/skills', '/v1/health', '/v1/ready', '/v1/auth/register', '/v1/auth/login', '/v1/auth/refresh', '/v1/auth/logout', '/v1/me', '/v1/me/sessions', '/v1/me/sessions/:id/revoke', '/v1/me/addresses', '/v1/me/addresses/:id', '/v1/me/addresses/:id/archive', 'unmatched'];
export function safeRoute(path: string): string {
  if (routes.includes(path)) return path;
  const partner = path.match(/^\/v1\/partners\/([^/]+)(\/[^/]+)?$/);
  if (partner && uuid.test(partner[1])) { const route = `/v1/partners/:id${partner[2] ?? ''}`; return routes.includes(route) ? route : 'unmatched'; }
  const match = path.match(/^\/v1\/me\/(sessions|addresses)\/([^/]+)(\/(revoke|archive))?$/);
  if (!match || !uuid.test(match[2])) return 'unmatched';
  const route = `/v1/me/${match[1]}/:id${match[3] ?? ''}`;
  return routes.includes(route) ? route : 'unmatched';
}
const codes = new Set(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENOTFOUND','EPIPE','53300','53400','57P01','57P02','57P03','57014','08000','08003','08006','VALIDATION','NOT_FOUND','INTERNAL','SERVICE_UNAVAILABLE']);
export function errorCode(value: unknown): string | undefined {
  return typeof value === 'string' && codes.has(value) ? value : undefined;
}
export function safeError(error: unknown, seen = new Set<unknown>(), depth = 0): Record<string, unknown> {
  if (depth >= 3 || seen.has(error)) return { type: 'Truncated' };
  if (!(error instanceof Error)) return { type: 'UnknownError' };
  seen.add(error);
  const e = error as Error & { code?: unknown };
  const type = ['Error','TypeError','RangeError','SyntaxError','ServiceUnavailableException','BadRequestException','NotFoundException'].includes(e.name) ? e.name : 'Error';
  // Keep frame positions only: paths, function names and messages may contain secrets.
  const frames = (e.stack ?? '').slice(0, 8192).split('\n').slice(1, 7).map(line => line.match(/:(\d+):(\d+)\)?$/)).filter(Boolean).map(m => `frame:${m![1].slice(0, 8)}:${m![2].slice(0, 8)}`);
  return { type, code: errorCode(e.code), frames, ...(e.cause !== undefined ? { cause: safeError(e.cause, seen, depth + 1) } : {}) };
}
export interface Metadata {
  request_id?: string; client_request_id?: string; method?: string; route?: string;
  status_code?: number; duration_ms?: number; operation?: string; error?: unknown; code?: string;
}
export function sanitize(input: Metadata): Metadata {
  const out: Metadata = {};
  for (const key of ['request_id','client_request_id'] as const) if (typeof input[key] === 'string' && uuid.test(input[key])) out[key] = input[key];
  if (['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'].includes(input.method ?? '')) out.method = input.method;
  if (routes.includes(input.route ?? '')) out.route = input.route;
  if (Number.isInteger(input.status_code) && input.status_code! >= 100 && input.status_code! <= 599) out.status_code = input.status_code;
  if (typeof input.duration_ms === 'number' && Number.isFinite(input.duration_ms) && input.duration_ms >= 0) out.duration_ms = Math.round(Math.min(input.duration_ms, 86400000) * 100) / 100;
  if (['partners.search','catalog.categories','catalog.skills','health.ready','migration','seed','pool'].includes(input.operation ?? '')) out.operation = input.operation;
  if (input.error !== undefined) out.error = safeError(input.error);
  const code = errorCode(input.code); if (code) out.code = code;
  return out;
}
