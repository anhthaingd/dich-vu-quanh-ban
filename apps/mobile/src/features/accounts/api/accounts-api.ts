import { requestJson, type JsonRequestOptions } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import { isMe } from '../../auth/api/auth-api';
import type { Me } from '../../auth/models/auth.types';
import { isAck, isAddress, isLoginSession, isPage, type Ack, type AddressInput, type LoginSession, type Page, type SavedAddress } from '../models';
export type ProfileEdit = { expected_version: number; display_name: string };
export interface AccountsApi {
  edit(token: string, input: ProfileEdit, key: string): Promise<Me>;
  addresses(token: string, cursor?: string): Promise<Page<SavedAddress>>;
  saveAddress(token: string, id: string | null, input: AddressInput, key: string): Promise<SavedAddress>;
  archiveAddress(token: string, id: string, key: string): Promise<Ack>;
  sessions(token: string, cursor?: string): Promise<Page<LoginSession>>;
  revokeSession(token: string, id: string, key: string): Promise<Ack>;
}
export function createAccountsApi(baseUrl: string | undefined, transport: typeof fetch = fetch): AccountsApi {
  async function call<T>(token: string, path: string, validate: (x: unknown) => x is T, options: JsonRequestOptions = {}, key?: string): Promise<T> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new ApiError('CONFIG');
    return await requestJson(baseUrl.replace(/\/$/, '') + '/me' + path, transport, undefined, undefined, validate, {
      ...options, headers: { Authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) },
    }) as T;
  }
  const page = (cursor?: string) => cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return {
    edit: (token,input,key) => call(token, '', isMe, { method: 'PATCH', body: input }, key),
    addresses: (token,cursor) => call(token, '/addresses'+page(cursor), isPage(isAddress)),
    saveAddress: (token,id,input,key) => call(token, '/addresses'+(id ? '/'+encodeURIComponent(id) : ''), isAddress, { method: id ? 'PUT' : 'POST', body: input }, key),
    archiveAddress: (token,id,key) => call(token, `/addresses/${encodeURIComponent(id)}/archive`, isAck, { method: 'POST' }, key),
    sessions: (token,cursor) => call(token, '/sessions'+page(cursor), isPage(isLoginSession)),
    revokeSession: (token,id,key) => call(token, `/sessions/${encodeURIComponent(id)}/revoke`, isAck, { method: 'POST' }, key),
  };
}
