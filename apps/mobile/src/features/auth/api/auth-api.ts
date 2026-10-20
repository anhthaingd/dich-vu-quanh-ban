import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import type { AuthApi, Me, Session } from '../models/auth.types';
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function isMe(value: unknown): value is Me {
  if (!value || typeof value !== 'object') return false;
  const m = value as Me;
  return Number.isSafeInteger(m.version) && m.version >= 1 && typeof m.id === 'string' && uuid.test(m.id) && typeof m.display_name === 'string'
    && typeof m.email_verified === 'boolean' && typeof m.phone_verified === 'boolean' && m.locale === 'vi' && ['active','suspended'].includes(m.status)
    && Array.isArray(m.partner_ids) && m.partner_ids.every(x => typeof x === 'string' && uuid.test(x))
    && Array.isArray(m.admin_permissions) && m.admin_permissions.every(x => typeof x === 'string');
}
function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  return typeof s.access_token === 'string' && s.access_token.length > 0 && s.access_token.length <= 4096
    && typeof s.refresh_token === 'string' && /^[a-f0-9]{64}$/.test(s.refresh_token)
    && typeof s.expires_at === 'string' && Number.isFinite(Date.parse(s.expires_at)) && isMe(s.user);
}
export function createAuthApi(baseUrl: string | undefined, transport: typeof fetch = fetch): AuthApi {
  const url = (path: string) => {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new ApiError('CONFIG');
    return baseUrl.replace(/\/$/, '') + path;
  };
  const session = async (path: string, body: unknown) => await requestJson(url(path), transport, undefined, undefined, isSession, { method: 'POST', body }) as Session;
  return {
    login: input => session('/auth/login', input),
    register: input => session('/auth/register', input),
    refresh: token => session('/auth/refresh', { refresh_token: token }),
    me: async token => await requestJson(url('/me'), transport, undefined, undefined, isMe, { headers: { Authorization: `Bearer ${token}` } }) as Me,
    logout: async token => { await requestJson(url('/auth/logout'), transport, undefined, undefined, value => {
      const ack = value as { id?: string; version?: number; state?: string } | null;
      return !!ack && typeof ack.id === 'string' && uuid.test(ack.id) && Number.isInteger(ack.version) && ack.version! >= 1 && ack.state === 'revoked';
    }, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); },
  };
}
