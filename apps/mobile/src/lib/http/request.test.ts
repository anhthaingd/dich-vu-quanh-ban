import { requestJson } from './request';
import { createDiagnosticLogger } from '../logging/logger';
const id = 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c';
afterEach(() => jest.useRealTimers());
test('success sends client UUID and returns parsed JSON', async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => id }, json: async () => ({ ok: true }) });
  expect(await requestJson('http://localhost', fetcher)).toEqual({ ok: true });
  expect(fetcher.mock.calls[0][1].headers['X-Client-Request-Id']).toMatch(/^[a-f\d-]{36}$/);
});
test.each([400,404,500,503,429])('safe typed HTTP failure %i', async status => {
  const log = createDiagnosticLogger();
  const fetcher = jest.fn().mockResolvedValue({ ok: false, status, headers: { get: () => id } });
  await expect(requestJson('http://CANARY', fetcher, undefined, log)).rejects.toMatchObject({ status, requestId: id });
  expect(log.exportJsonl()).not.toContain('CANARY'); expect(log.exportJsonl()).toContain(id);
});
test('malformed JSON and invalid server ID are safe', async () => {
  const log = createDiagnosticLogger();
  await expect(requestJson('http://CANARY', jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'CANARY' }, json: async () => { throw new Error('CANARY'); } }), undefined, log)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  expect(log.exportJsonl()).toContain('response.invalid'); expect(log.exportJsonl()).not.toContain('CANARY');
});
test('network failure drops raw exception and URL', async () => {
  const log = createDiagnosticLogger();
  await expect(requestJson('http://CANARY', jest.fn().mockRejectedValue(new Error('CANARY')), undefined, log)).rejects.toMatchObject({ code: 'NETWORK' });
  expect(log.exportJsonl()).not.toContain('CANARY');
});
test('timeout bounds requests even when transport ignores abort', async () => {
  jest.useFakeTimers(); const log = createDiagnosticLogger(); const fetcher = jest.fn(() => new Promise<Response>(() => {}));
  const result = expect(requestJson('http://localhost', fetcher, undefined, log)).rejects.toMatchObject({ code: 'TIMEOUT' });
  await jest.advanceTimersByTimeAsync(10000); await result;
  expect(fetcher.mock.calls[0]).toBeDefined(); expect(log.exportJsonl()).toContain('request.timeout'); expect(jest.getTimerCount()).toBe(0);
});
test('caller cancellation is debug and removes timer/listener', async () => {
  jest.useFakeTimers(); const signal = new AbortController(); const log = createDiagnosticLogger();
  const removed = jest.spyOn(signal.signal, 'removeEventListener');
  const result = expect(requestJson('http://localhost', jest.fn(() => new Promise<Response>(() => {})), signal.signal, log)).rejects.toMatchObject({ code: 'CANCELLED' });
  signal.abort(); await result;
  expect(log.exportJsonl()).toContain('"level":"debug"'); expect(removed).toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
});
test('already aborted caller never starts fetch', async () => {
  const controller = new AbortController(); controller.abort(); const fetcher = jest.fn();
  await expect(requestJson('http://localhost', fetcher, controller.signal)).rejects.toMatchObject({ code: 'CANCELLED' }); expect(fetcher).not.toHaveBeenCalled();
});
test('schema validation failure preserves correlation in diagnostics', async () => {
  const log = createDiagnosticLogger();
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => id }, json: async () => ({ malformed: true }) });
  await expect(requestJson('http://localhost', fetcher, undefined, log, () => false)).rejects.toMatchObject({ code: 'INVALID_RESPONSE', requestId: id });
  expect(log.exportJsonl()).toContain(id);
});
test('JSON mutation preserves authorization, overrides caller correlation ID and never logs secrets', async () => {
  const log = createDiagnosticLogger();
  const fetcher = jest.fn().mockResolvedValue({ ok: false, status: 401, headers: { get: () => id } });
  await expect(requestJson('http://localhost/auth/login', fetcher, undefined, log, undefined, {
    method: 'POST', body: { password: 'PASSWORD_CANARY' },
    headers: { Authorization: 'Bearer TOKEN_CANARY', 'x-client-request-id': 'CALLER_CANARY' },
  })).rejects.toMatchObject({ code: 'UNAUTHENTICATED', status: 401, requestId: id });
  expect(fetcher).toHaveBeenCalledTimes(1);
  const init = fetcher.mock.calls[0][1];
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ password: 'PASSWORD_CANARY' });
  const headers = new Headers(init.headers);
  expect(headers.get('content-type')).toBe('application/json');
  expect(headers.get('authorization')).toBe('Bearer TOKEN_CANARY');
  expect(headers.get('x-client-request-id')).toMatch(/^[a-f\d-]{36}$/);
  expect(log.exportJsonl()).not.toContain('CANARY');
});
test.each([[401, 'UNAUTHENTICATED'], [403, 'FORBIDDEN'], [429, 'RATE_LIMITED']] as const)(
  'maps status %i without exposing server error content', async (status, code) => {
    const json = jest.fn(async () => ({ message: 'SERVER_CANARY' }));
    const fetcher = jest.fn().mockResolvedValue({ ok: false, status, headers: { get: () => id }, json });
    await expect(requestJson('http://localhost', fetcher)).rejects.toMatchObject({ code, status });
    expect(json).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
test('a timed out mutation is cancelled without automatic replay', async () => {
  jest.useFakeTimers();
  const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(() => new Promise<Response>(() => {}));
  const result = expect(requestJson('http://localhost/auth/login', fetcher, undefined, undefined, undefined,
    { method: 'POST', body: { email: 'example@example.test', password: 'CANARY' } })).rejects.toMatchObject({ code: 'TIMEOUT' });
  await jest.advanceTimersByTimeAsync(10000); await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
});
