import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileOutput } from '../../src/logging/output.js';
import { AppLog } from '../../src/logging/logger.js';
test('rolling file flushes JSONL and retains two old files plus active', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dvqb-log-'));
  let failed = false;
  const output = await fileOutput(directory, () => { failed = true; }, '1k');
  const log = new AppLog(output.stream, 'debug', 'test');
  try {
    for (let i = 0; i < 80; i++) {
      log.emit('db.completed', { operation: 'catalog.skills', duration_ms: i });
      await new Promise<void>((resolve, reject) => output.stream.flush(error => error ? reject(error) : resolve()));
      await delay(2);
    }
    await output.close();
    const files = await readdir(directory); assert.ok(files.length <= 3); assert.ok(files.length >= 2);
    for (const name of files) {
      const text = await readFile(join(directory, name), 'utf8');
      assert.ok(Buffer.byteLength(text) < 1024 + 2048);
      for (const line of text.trim().split('\n').filter(Boolean)) assert.equal(JSON.parse(line).service, 'api');
    }
    assert.equal(failed, false);
  } finally { await output.close(); await rm(directory, { recursive: true, force: true }); }
});
test('file output failure surfaces and rejects further writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dvqb-log-'));
  try {
    await writeFile(join(directory, 'blocked'), 'x');
    await assert.rejects(fileOutput(join(directory, 'blocked'), () => {}));
    let failed = false; const output = await fileOutput(directory, () => { failed = true; });
    output.stream.emit('error', new Error('fixture')); assert.equal(failed, true);
    assert.throws(() => output.write('{}\n'));
    const closed = once(output.stream, 'close'); output.stream.destroy(); await closed; await output.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
