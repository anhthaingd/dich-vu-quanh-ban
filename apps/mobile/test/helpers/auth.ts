import type { PartnersApi } from '../../src/features/partners/api/partners-api';
import type { AccountsApi } from '../../src/features/accounts/api/accounts-api';
import { AuthSession } from '../../src/features/auth/state/auth-session';
import type { AuthApi, Session, TokenStorage } from '../../src/features/auth/models/auth.types';
export const session: Session = {
  access_token: 'access-test-only', refresh_token: 'a'.repeat(64), expires_at: '2099-01-01T00:00:00Z',
  user: { id: '00000000-0000-4000-8000-000000000001', version: 1, display_name: 'Người thử', phone_verified: false, email_verified: false, locale: 'vi', partner_ids: [], admin_permissions: [], status: 'active' },
};
export const credentials = { email: 'test@example.test', password: 'test-only-long-password' };
export function authFixture(saved: string | null = null, partners?: PartnersApi) {
  const api: jest.Mocked<AuthApi> = {
    login: jest.fn().mockResolvedValue(session), register: jest.fn().mockResolvedValue(session),
    refresh: jest.fn().mockResolvedValue({ ...session, refresh_token: 'b'.repeat(64) }),
    me: jest.fn().mockResolvedValue(session.user), logout: jest.fn().mockResolvedValue(undefined),
  };
  const storage: jest.Mocked<TokenStorage> = {
    read: jest.fn(async () => saved), write: jest.fn(async token => { saved = token; }), clear: jest.fn(async () => { saved = null; }),
  };
  const accounts: jest.Mocked<AccountsApi> = { addresses: jest.fn().mockResolvedValue({ items: [], next_cursor: null }), sessions: jest.fn().mockResolvedValue({ items: [], next_cursor: null }), saveAddress: jest.fn(), archiveAddress: jest.fn(), revokeSession: jest.fn(), edit: jest.fn().mockImplementation(async (_token, input) => ({ ...session.user, display_name: input.display_name, version: input.expected_version + 1 })) };
  return { api, accounts, storage, manager: new AuthSession(api, storage, accounts, partners) };
}
