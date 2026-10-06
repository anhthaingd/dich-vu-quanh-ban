import { safeRoute } from '../../src/logging/sanitize.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { events, severity } from '../../src/logging/events.js';
import { sanitize, safeError } from '../../src/logging/sanitize.js';
import { requestContext } from '../../src/logging/logger.js';
import { databaseOperation } from '../../src/database/operation.js';
import { captureLogs } from '../helpers/logs.js';

test('stable registry levels and HTTP status/health levels', () => {
  for (const event of Object.keys(events) as (keyof typeof events)[]) assert.equal(severity(event), events[event]);
  assert.equal(severity('http.completed', 500), 'error'); assert.equal(severity('http.completed', 400), 'warn');
  for (const route of ['/v1/health','/v1/ready']) assert.equal(severity('http.completed', 200, route), 'debug');
});
test('JSONL allowlist, bound records, error/cause cycles and context', async () => {
  const logs = captureLogs(); const id = randomUUID();
  const error = new Error('CANARY password=CANARY'); error.cause = error;
  error.stack = 'CANARY\n at CANARY (/private/CANARY.ts:12:3)';
  requestContext.run({ request_id: id }, () => logs.log.emit('http.exception', { error, status_code: 500, ...{ body: 'CANARY', token: 'CANARY' } }));
  logs.log.root.info({ headers: 'CANARY', event: 'injected-CANARY' }, 'CANARY');
  logs.log.log(); logs.log.warn(); logs.log.debug(); logs.log.verbose(); logs.log.error(error); logs.log.fatal(error);
  await logs.log.flush();
  assert.ok(!logs.text().includes('CANARY'));
  for (const line of logs.text().trim().split('\n')) assert.ok(Buffer.byteLength(line) < 2048);
  const first = logs.records()[0]; assert.equal(first.request_id, id); assert.equal(first.error.cause.type, 'Truncated');
  assert.equal(first.level, 'error'); assert.equal(first.message, 'http.exception'); assert.ok(first.timestamp.endsWith('Z'));
  assert.deepEqual(safeError(null), { type: 'UnknownError' });
  const deep = new Error('x', { cause: new Error('y', { cause: new Error('z', { cause: new Error('q') }) }) });
  assert.ok(JSON.stringify(safeError(deep)).includes('Truncated'));
  const custom = new Error('x'); custom.name = 'CANARY'; custom.stack = undefined;
  assert.equal(safeError(custom).type, 'Error');
});
test('sanitizer rejects untrusted metadata and bounds duration', () => {
  const id = randomUUID();
  assert.deepEqual(sanitize({ request_id: id, client_request_id: id, method: 'GET', route: '/v1/skills', status_code: 200, duration_ms: 1.234, operation: 'catalog.skills', code: 'ECONNREFUSED' }), { request_id: id, client_request_id: id, method: 'GET', route: '/v1/skills', status_code: 200, duration_ms: 1.23, operation: 'catalog.skills', code: 'ECONNREFUSED' });
  assert.deepEqual(sanitize({ request_id: 'bad', client_request_id: 'bad', method: 'CANARY', route: '/secret', status_code: 999, duration_ms: -1, operation: 'SELECT secret', code: 'CANARY' }), {});
  for (const value of [NaN,Infinity,-1]) assert.deepEqual(sanitize({ duration_ms: value }), {});
  assert.equal(sanitize({ duration_ms: 1e10 }).duration_ms, 86400000);
});
test('driver error classification and safe operation timing', async () => {
  const logs = captureLogs();
  assert.equal(await databaseOperation(logs.log, 'catalog.skills', async () => 42), 42);
  await databaseOperation(logs.log, 'catalog.skills', async () => { await new Promise(r => setTimeout(r, 510)); });
  assert.ok(logs.records().some(x => x.event === 'db.slow'));
  for (const code of ['ECONNREFUSED','57014']) await assert.rejects(databaseOperation(logs.log, 'catalog.skills', async () => { throw Object.assign(new Error('CANARY'), { code }); }), { status: 503 });
  await assert.rejects(databaseOperation(logs.log, 'catalog.skills', async () => { throw new Error('timeout exceeded when trying to connect'); }), { status: 503 });
  await assert.rejects(databaseOperation(logs.log, 'catalog.skills', async () => { throw new TypeError('CANARY'); }), TypeError);
  await assert.rejects(databaseOperation(logs.log, 'catalog.skills', async () => { throw null; }));
  assert.ok(!logs.text().includes('CANARY'));
});

test('account route logging keeps templates only and rejects arbitrary private paths', () => {
  const id='00000000-0000-4000-8000-000000000001';
  assert.equal(safeRoute('/v1/me/addresses'),'/v1/me/addresses');
  assert.equal(safeRoute(`/v1/me/addresses/${id}`),'/v1/me/addresses/:id');
  assert.equal(safeRoute(`/v1/me/addresses/${id}/archive`),'/v1/me/addresses/:id/archive');
  assert.equal(safeRoute(`/v1/me/sessions/${id}/revoke`),'/v1/me/sessions/:id/revoke');
  for(const path of ['/v1/me/addresses/PRIVATE_CANARY',`/v1/me/sessions/${id}/archive`,'/private']) assert.equal(safeRoute(path),'unmatched');
});
