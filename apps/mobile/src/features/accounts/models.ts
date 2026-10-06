export type Ack = { id: string; version: number; state: string };
export type SavedAddress = { id: string; version: number; is_default: boolean; label: string; address: { text: string; point: { latitude: number; longitude: number } } };
export type AddressInput = Omit<SavedAddress, 'id' | 'version'> & { expected_version?: number };
export type LoginSession = Ack & { state: 'active' | 'expired' | 'revoked'; created_at: string; last_seen_at: string | null; is_current: boolean };
export type Page<T> = { items: T[]; next_cursor: string | null };
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const uuid = (x: unknown) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export const isAck = (x: unknown): x is Ack => record(x) && uuid(x.id) && Number.isSafeInteger(x.version) && Number(x.version) > 0 && typeof x.state === 'string';
export const isAddress = (x: unknown): x is SavedAddress => record(x) && uuid(x.id) && Number.isSafeInteger(x.version) && Number(x.version)>0
  && typeof x.is_default === 'boolean' && typeof x.label === 'string' && record(x.address) && typeof x.address.text === 'string' && record(x.address.point)
  && typeof x.address.point.latitude === 'number' && Number.isFinite(x.address.point.latitude) && Math.abs(x.address.point.latitude)<=90
  && typeof x.address.point.longitude === 'number' && Number.isFinite(x.address.point.longitude) && Math.abs(x.address.point.longitude)<=180;
const date = (x: unknown) => typeof x === 'string' && Number.isFinite(Date.parse(x));
export const isLoginSession = (x: unknown): x is LoginSession => record(x) && isAck(x) && ['active','expired','revoked'].includes(x.state)
  && 'is_current' in x && typeof x.is_current === 'boolean' && 'created_at' in x && date(x.created_at) && 'last_seen_at' in x && (x.last_seen_at === null || date(x.last_seen_at));
export const isPage = <T>(valid: (x: unknown) => x is T) => (x: unknown): x is Page<T> => record(x) && Array.isArray(x.items) && x.items.every(valid) && (x.next_cursor === null || (typeof x.next_cursor === 'string' && !!x.next_cursor));
