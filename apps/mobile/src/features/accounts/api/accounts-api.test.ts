import { createAccountsApi } from './accounts-api';
import { session } from '../../../../test/helpers/auth';
const input = { expected_version: 1, display_name: 'Name' };
test('profile PATCH sends version and operation key, validates version in Me', async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => session.user });
  const api = createAccountsApi('http://localhost/v1/', fetcher);
  await api.edit('token', input, 'operation-key');
  expect(fetcher).toHaveBeenCalledWith('http://localhost/v1/me', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input), headers: expect.objectContaining({ Authorization: 'Bearer token', 'Idempotency-Key': 'operation-key' }) }));
  fetcher.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...session.user, version: undefined }) });
  await expect(api.edit('token', input, 'key')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  await expect(createAccountsApi(undefined).edit('token', input, 'key')).rejects.toMatchObject({ code: 'CONFIG' });
});
test.each(['VERSION_CONFLICT', 'IDEMPOTENCY_MISMATCH', 'SECRET_BODY'])('only known conflict codes reach UI: %s', async code => {
  const api = createAccountsApi('http://localhost/v1', jest.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code }) }));
  await expect(api.edit('token', input, 'key')).rejects.toMatchObject({ code: code === 'SECRET_BODY' ? 'HTTP' : code });
});
