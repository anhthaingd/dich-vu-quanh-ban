import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/bootstrap.js';

test('server request ID is returned on success and matches safe error response', async () => {
  const app = await createApp({ databaseUrl: 'postgresql://x:x@127.0.0.1:1/dvqb_test', cursorSecret: 's'.repeat(32), port: 0, host: '127.0.0.1' });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const success = await fetch(base + '/v1/health');
    assert.match(success.headers.get('x-request-id') ?? '', /^[\da-f-]{36}$/);
    const invalid = await fetch(base + '/v1/skills?limit=0');
    assert.equal(invalid.status, 400);
    const body = await invalid.json();
    assert.equal(body.correlation_id, invalid.headers.get('x-request-id'));
  } finally { await app.close(); }
});

import { databaseFixture } from '../helpers/database.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
test('parallel HTTP requests have one completion, matching IDs, safe errors and no canary leak', async () => {
  const f = await databaseFixture();
  try {
    const clientId = randomUUID();
    const paths = ['/categories?parent_id=root','/skills?limit=0','/CANARY?token=CANARY','/health','/ready'];
    const responses = await Promise.all(Array.from({ length: 25 }, (_, i) => fetch(f.base + paths[i % paths.length], { headers: { Authorization: 'Bearer CANARY', Cookie: 'secret=CANARY', 'X-Client-Request-Id': clientId, Origin: 'http://localhost' } })));
    const ids = new Set<string>();
    for (const response of responses) {
      const id = response.headers.get('x-request-id')!; ids.add(id);
      assert.ok(response.headers.get('access-control-expose-headers')?.includes('X-Request-Id'));
      const body = await response.json(); if (!response.ok) assert.equal(body.correlation_id, id);
    }
    assert.equal(ids.size, 25);
    await delay(10);
    const completions = f.logs.records().filter(x => x.event === 'http.completed'); assert.equal(completions.length, 25);
    for (const record of completions) { assert.ok(ids.has(record.request_id)); assert.equal(record.client_request_id, clientId); }
    assert.ok(!f.logs.text().includes('CANARY'));
    const service = f.app.get(CatalogService); service.list = async () => { throw new TypeError('CANARY SQL/password'); };
    const error = await fetch(f.base + '/skills', { headers: { 'X-Client-Request-Id': 'invalid-CANARY' } });
    assert.equal(error.status, 500); const body = await error.json(); assert.equal(body.code, 'INTERNAL'); assert.equal(body.correlation_id, error.headers.get('x-request-id'));
    const record = f.logs.records().find(x => x.event === 'http.exception' && x.request_id === body.correlation_id); assert.ok(record); assert.equal(record.error.type, 'TypeError');
    assert.ok(!f.logs.text().includes('CANARY')); assert.equal(f.pool.waitingCount, 0);
  } finally { await f.close(); }
});
test('client abort produces exactly one terminal event', async () => {
  const f = await databaseFixture();
  try {
    let started!: () => void; const entered = new Promise<void>(r => { started = r; });
    f.app.get(CatalogService).list = async () => { started(); await delay(80); return { items: [], next_cursor: null }; };
    const req = httpRequest(f.base + '/skills'); req.on('error', () => {}); req.end();
    await entered; req.destroy(); await delay(150);
    const terminal = f.logs.records().filter(x => x.event === 'http.aborted' || x.event === 'http.completed');
    assert.equal(terminal.length, 1); assert.equal(terminal[0].event, 'http.aborted');
  } finally { await f.close(); }
});
