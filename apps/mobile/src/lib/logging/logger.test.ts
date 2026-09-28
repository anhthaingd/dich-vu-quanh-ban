import { createDiagnosticLogger } from './logger';
test('ring holds last 200 sanitized JSONL records below 2KB', () => {
  const sink = jest.fn(); const log = createDiagnosticLogger(sink); expect(log.exportJsonl()).toBe('');
  const id = 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c';
  for (let i = 0; i < 220; i++) log.emit('request.failed', { request_id: id, client_request_id: id, status_code: 503, duration_ms: i, ...{ password: 'CANARY', body: 'CANARY' } });
  const lines = log.exportJsonl().trim().split('\n'); expect(lines).toHaveLength(200); expect(JSON.parse(lines[0]).duration_ms).toBe(20);
  expect(lines.every(line => line.length < 2048)).toBe(true); expect(log.exportJsonl()).not.toContain('CANARY'); expect(sink).toHaveBeenCalledTimes(220);
  log.clear(); expect(log.exportJsonl()).toBe('');
});
test('rejects invalid metadata and ignores sink failure', () => {
  const log = createDiagnosticLogger(() => { throw Error('broken sink'); });
  for (const duration_ms of [-1,NaN,Infinity,1e10]) log.emit('request.retry', { request_id: 'bad', client_request_id: 'bad', status_code: 999, duration_ms });
  expect(log.exportJsonl()).not.toContain('bad'); expect(log.exportJsonl()).not.toContain('status_code'); expect(log.exportJsonl()).toContain('86400000');
  log.emit('response.invalid'); log.emit('request.timeout'); log.emit('request.cancelled');
});
