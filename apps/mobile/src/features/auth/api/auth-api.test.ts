import { createAuthApi } from './auth-api';
import { session, credentials } from '../../../../test/helpers/auth';
function response(value: unknown) { return { ok: true, status: 200, headers: { get: () => null }, json: async () => value }; }
test('auth uses canonical routes, JSON bodies and bearer headers', async () => {
  const transport = jest.fn().mockResolvedValue(response(session));
  const api = createAuthApi('http://localhost/v1/', transport);
  expect(await api.register({ ...credentials, display_name: 'Người thử' })).toEqual(session);
  await api.login(credentials); await api.refresh(session.refresh_token);
  transport.mockResolvedValueOnce(response(session.user)); expect(await api.me(session.access_token)).toEqual(session.user);
  transport.mockResolvedValueOnce(response({ id: session.user.id, version: 1, state: 'revoked' })); await api.logout(session.access_token);
  expect(transport.mock.calls.map(c => c[0])).toEqual(['/auth/register','/auth/login','/auth/refresh','/me','/auth/logout'].map(path => 'http://localhost/v1' + path));
  expect(transport.mock.calls[3][1].headers.Authorization).toBe('Bearer ' + session.access_token);
  expect(JSON.parse(transport.mock.calls[2][1].body)).toEqual({ refresh_token: session.refresh_token });
});
test.each([null, {}, { ...session, refresh_token: 'bad' }, { ...session, expires_at: 'bad' }, { ...session, user: { ...session.user, admin_permissions: [12] } }])('rejects malformed session response', async value => {
  const api = createAuthApi('http://localhost', jest.fn().mockResolvedValue(response(value)));
  await expect(api.login(credentials)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('invalid config, profile and logout acknowledgement fail closed', async () => {
  await expect(createAuthApi(undefined).login(credentials)).rejects.toMatchObject({ code: 'CONFIG' });
  const api = createAuthApi('http://localhost', jest.fn().mockResolvedValue(response(null)));
  await expect(api.me('token')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  await expect(api.logout('token')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
