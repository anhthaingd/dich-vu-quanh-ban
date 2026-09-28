import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportLogs } from './export.mjs';
test('export filters request/time, sanitizes fields, never overwrites and respects size bound', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dvqb-export-')); const directory = join(root, 'logs'); await mkdir(directory);
  const id = 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c';
  const entry = { timestamp: '2026-09-28T00:00:00Z', service: 'api', level: 'error', event: 'http.completed', request_id: id, status_code: 500, duration_ms: 42, secret: 'CANARY', message: 'CANARY' };
  try {
    await writeFile(join(directory, 'api-1.1'), JSON.stringify(entry)+'\n'+JSON.stringify({ ...entry, timestamp: '2020-01-01' })+'\nmalformed\n');
    const output = join(root, 'export.jsonl');
    assert.equal((await exportLogs({ directory, output, requestId: id, from: '2026-01-01' })).records, 1);
    assert.ok(!(await readFile(output, 'utf8')).includes('CANARY'));
    await assert.rejects(exportLogs({ directory, output }));
    const limited = await exportLogs({ directory, output: join(root, 'limited'), maxBytes: 1 }); assert.equal(limited.truncated, true); assert.equal(limited.bytes, 0);
    for (const options of [{ requestId: 'bad' }, { from: 'bad' }, { from: '2026-01-01', to: '2020-01-01' }, { maxBytes: 99999999 }, { output: join(directory, 'api-2.1') }]) await assert.rejects(exportLogs({ directory, output: join(root, 'invalid'), ...options }));
    await writeFile(join(directory, 'api-1.2'), (JSON.stringify(entry)+'\n').repeat(40000));
    const capped = await exportLogs({ directory, output: join(root, 'max') }); assert.ok(capped.truncated); assert.ok(capped.bytes <= 5*1024*1024);
  } finally { await rm(root, { recursive: true, force: true }); }
});
