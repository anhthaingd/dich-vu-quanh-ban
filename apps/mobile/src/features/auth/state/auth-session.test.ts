import { ApiError } from '../../../lib/http/api-error';
import { authFixture, credentials, session } from '../../../../test/helpers/auth';

test('register persists only refresh token and logout revokes before clearing storage', async () => {
  const f = authFixture(); const changed = jest.fn(); const unsubscribe = f.manager.subscribe(changed);
  await f.manager.restore(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
  await f.manager.register({ ...credentials, display_name: 'Người thử' });
  expect(f.storage.write).toHaveBeenCalledWith(session.refresh_token);
  expect(JSON.stringify(f.manager.getSnapshot())).not.toContain('access-test-only');
  await f.manager.logout();
  expect(f.api.logout).toHaveBeenCalledWith(session.access_token);
  expect(f.storage.clear).toHaveBeenCalledTimes(1);
  expect(f.manager.getSnapshot().phase).toBe('anonymous');
  expect(changed).toHaveBeenCalled(); unsubscribe();
});
test('cold start rotates saved token; offline restore retains it and can be retried', async () => {
  const f = authFixture('saved-refresh');
  f.api.refresh.mockRejectedValueOnce(new ApiError('NETWORK'));
  await f.manager.restore();
  expect(f.manager.getSnapshot().phase).toBe('restore-error'); expect(f.storage.clear).not.toHaveBeenCalled();
  await f.manager.restore(); expect(f.manager.getSnapshot().phase).toBe('authenticated');
  expect(await f.storage.read()).toBe('b'.repeat(64));
});
test('invalid saved session is removed; unknown secure storage failure never becomes authenticated', async () => {
  const f = authFixture('revoked'); f.api.refresh.mockRejectedValue(new ApiError('UNAUTHENTICATED'));
  await f.manager.restore(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
  f.storage.read.mockRejectedValue(new Error('PRIVATE_CANARY'));
  await f.manager.restore(); expect(f.manager.getSnapshot().phase).toBe('restore-error');
  expect(f.manager.getSnapshot().error).not.toContain('CANARY');
});
test('storage write failure compensates login with logout and never exposes a successful session', async () => {
  const f = authFixture(); await f.manager.restore(); f.storage.write.mockRejectedValue(new Error('PRIVATE_CANARY'));
  await f.manager.login(credentials); expect(f.api.logout).toHaveBeenCalledWith(session.access_token);
  expect(f.manager.getSnapshot().phase).toBe('anonymous'); expect(f.manager.getSnapshot().error).not.toContain('CANARY');
});
test('double submit is ignored while operation is pending; logout cannot race refresh', async () => {
  const f = authFixture(); await f.manager.restore();
  let resolve!: (s: typeof session) => void;
  f.api.login.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const pending = f.manager.login(credentials); await f.manager.login(credentials); await f.manager.logout();
  expect(f.api.login).toHaveBeenCalledTimes(1); expect(f.api.logout).not.toHaveBeenCalled();
  resolve(session); await pending; await f.manager.logout(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
});
test('foreground checks while signed out do not swallow a concurrent login tap', async () => {
  const f = authFixture(); await f.manager.restore();
  const foreground = f.manager.verify();
  const login = f.manager.login(credentials);
  await Promise.all([foreground, login]);
  expect(f.api.login).toHaveBeenCalledTimes(1);
  expect(f.manager.getSnapshot().phase).toBe('authenticated');
});
test('expiry refreshes once before profile lookup; 401 also refreshes then retries only GET', async () => {
  const f = authFixture(); f.api.login.mockResolvedValueOnce({ ...session, expires_at: '2000-01-01T00:00:00Z' });
  await f.manager.login(credentials); await f.manager.verify(); expect(f.api.refresh).toHaveBeenCalledTimes(1);
  f.api.me.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await f.manager.verify(); expect(f.api.refresh).toHaveBeenCalledTimes(2); expect(f.manager.getSnapshot().error).toBeNull();
});
test('revocation clears session, network errors keep it and offline logout does not pretend success', async () => {
  const f = authFixture(); await f.manager.login(credentials);
  f.api.me.mockRejectedValueOnce(new ApiError('NETWORK')); await f.manager.verify(); expect(f.manager.getSnapshot().phase).toBe('authenticated');
  f.api.logout.mockRejectedValueOnce(new ApiError('NETWORK')); await f.manager.logout(); expect(f.storage.clear).not.toHaveBeenCalled();
  f.api.me.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')); f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await f.manager.verify(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
  await f.manager.verify(); await f.manager.logout();
});
test('failed GET after rotation clears unauthorized session; expired logout rotates before revoke', async () => {
  const f = authFixture(); await f.manager.login(credentials);
  f.api.me.mockRejectedValue(new ApiError('UNAUTHENTICATED')); await f.manager.verify(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
  f.api.login.mockResolvedValueOnce({ ...session, expires_at: '2000-01-01T00:00:00Z' });
  await f.manager.login(credentials); await f.manager.logout(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
});
test.each(['VALIDATION','RATE_LIMITED','UNAUTHENTICATED'] as const)('login %s presents safe actionable error', async code => {
  const f = authFixture(); await f.manager.restore(); f.api.login.mockRejectedValueOnce(new ApiError(code));
  await f.manager.login(credentials); expect(f.manager.getSnapshot().error).toBe(code); expect(f.manager.getSnapshot().busy).toBe(false);
});
test('already invalid logout clears storage; refresh network errors leave account available for retry', async () => {
  const f = authFixture(); await f.manager.login(credentials);
  f.api.me.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')); f.api.refresh.mockRejectedValueOnce(new ApiError('NETWORK'));
  await f.manager.verify(); expect(f.manager.getSnapshot().phase).toBe('authenticated');
  f.api.logout.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')); await f.manager.logout(); expect(f.manager.getSnapshot().phase).toBe('anonymous');
});
