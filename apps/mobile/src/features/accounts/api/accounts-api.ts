import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import { isMe } from '../../auth/api/auth-api';
import type { Me } from '../../auth/models/auth.types';
export type ProfileEdit = { expected_version: number; display_name: string };
export interface AccountsApi { edit(token: string, input: ProfileEdit, key: string): Promise<Me> }
export function createAccountsApi(baseUrl: string | undefined, transport: typeof fetch = fetch): AccountsApi {
  return { edit: async (token, input, key) => {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new ApiError('CONFIG');
    return await requestJson(baseUrl.replace(/\/$/, '') + '/me', transport, undefined, undefined, isMe, {
      method: 'PATCH', body: input, headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key },
    }) as Me;
  } };
}
