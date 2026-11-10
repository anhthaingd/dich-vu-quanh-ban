import { readFile, readdir, rm, stat } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
async function port() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const value = (server.address() as {port:number}).port; await new Promise<void>(resolve => server.close(() => resolve())); return value; }
function child(file: string, env: NodeJS.ProcessEnv, args: string[] = [], parentEnv = globalThis.process.env) {
  // Keep OS/runtime support and c8 collection, but require every app setting to
  // come from the fixture. A terminal may have sourced the AWS deployment env.
  const inherited: NodeJS.ProcessEnv = {};
  for (const name of ['PATH','HOME','TMPDIR','TMP','TEMP','SystemRoot','WINDIR','COMSPEC','PATHEXT','NODE_V8_COVERAGE']) {
    if (parentEnv[name] !== undefined) inherited[name] = parentEnv[name];
  }
  const process = spawn(globalThis.process.execPath, ['--import','tsx',file,...args], { env: { ...inherited, NODE_ENV: 'test', ...env }, stdio: ['ignore','pipe','pipe'] });
  let stdout = '', stderr = ''; process.stdout.on('data', x => { stdout += x; }); process.stderr.on('data', x => { stderr += x; });
  const closed = once(process, 'close');
  return { process, closed, output: () => stdout, error: () => stderr };
}
async function checkLifecycle(parentEnv = globalThis.process.env) {
  const p = await port();
  const previous = new Set(await readdir('../../.local/logs').catch(() => [] as string[]));
  const run = child('src/main.ts', { DATABASE_URL: 'postgresql://fixture:CANARY@127.0.0.1:1/dvqb_test', CURSOR_SECRET: 's'.repeat(32), PORT: String(p), LOG_LEVEL: 'debug', LOG_TO_FILE: '1' }, [], parentEnv);
  try {
    const deadline = Date.now() + 10000;
    while (!run.output().includes('app.started') && run.process.exitCode === null && Date.now() < deadline) await new Promise(r => setTimeout(r, 30));
    assert.ok(run.output().includes('app.started'), `API did not start: exit=${run.process.exitCode}, signal=${run.process.signalCode}\nstdout:\n${run.output()}\nstderr:\n${run.error()}`);
    const response = await fetch(`http://127.0.0.1:${p}/v1/health`); assert.equal(response.status, 200);
    run.process.kill('SIGTERM'); const [code] = await run.closed; assert.equal(code, 0);
    assert.ok(run.output().includes('app.stopped')); assert.ok(!run.output().includes('CANARY'));
    run.output().trim().split('\n').forEach(line => JSON.parse(line));
    const files = (await readdir('../../.local/logs')).filter(name => name.startsWith(`api-${run.process.pid}.`) && !previous.has(name));
    assert.ok(files.length > 0);
    const saved = (await Promise.all(files.map(name => readFile(`../../.local/logs/${name}`, 'utf8')))).join('');
    assert.ok(saved.includes('app.started')); assert.ok(saved.includes('app.stopped')); assert.ok(!saved.includes('CANARY'));
    for (const name of files) { assert.equal((await stat(`../../.local/logs/${name}`)).mode & 0o777, 0o600); await rm(`../../.local/logs/${name}`); }
  } finally { if (run.process.exitCode === null) run.process.kill('SIGKILL'); }
}
test('main starts, serves, stops and flushes structured lifecycle events', { timeout: 15000 }, async () => {
  await checkLifecycle();
});
test('lifecycle subprocess ignores exported deployment credentials and local app settings', { timeout: 15000 }, async () => {
  // These exports alone used to activate LiveKit without a URL and abort startup.
  await checkLifecycle({ ...globalThis.process.env, LIVEKIT_API_KEY: 'fixture-key', LIVEKIT_API_SECRET: 'fixture-secret' });
  // Other shell settings must not change the isolated test configuration either.
  await checkLifecycle({ ...globalThis.process.env, CLOUD_PILOT: '1', LOCAL_OPERATIONAL_DATA: '1', HOST: 'invalid.test', AUTH_SECRET: 'short' });
});
test('startup failure is fatal JSON with safe details and nonzero exit', { timeout: 10000 }, async () => {
  const run = child('src/main.ts', { DATABASE_URL: '', CURSOR_SECRET: 'CANARY' });
  const [code] = await run.closed; assert.equal(code, 1); assert.ok(run.output().includes('app.start_failed')); assert.ok(!run.output().includes('CANARY'));
});
test('CLI migration and seed emit structured success; unsafe seed mode fails', async () => {
  const url = globalThis.process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
  // An isolated schema is specified via PGOPTIONS and always removed.
  const { Pool } = await import('pg'); const { randomUUID } = await import('node:crypto');
  const schema = `cli_${randomUUID().replaceAll('-', '')}`; const pool = new Pool({ connectionString: url });
  await pool.query(`CREATE SCHEMA ${schema}`);
  try {
    for (const action of ['migrate','seed']) { const run = child('src/database/cli.ts', { DATABASE_URL: url, PGOPTIONS: `-c search_path=${schema},public` }, [action]); assert.equal((await run.closed)[0], 0); assert.ok(run.output().includes(`db.${action === 'migrate' ? 'migration' : 'seed'}.completed`)); }
    const run = child('src/database/cli.ts', { DATABASE_URL: url, NODE_ENV: 'production' }, ['seed']); assert.equal((await run.closed)[0], 1); assert.ok(run.output().includes('db.operation_failed'));
  } finally { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
});
test('CLI config failure is structured and cannot expose credentials', async () => {
  for (const DATABASE_URL of ['', 'postgres://CANARY:%xx@localhost/test']) {
    const run = child('src/database/cli.ts', { DATABASE_URL }, ['migrate']);
    assert.equal((await run.closed)[0], 1); assert.ok(run.output().includes('db.operation_failed')); assert.ok(!run.output().includes('CANARY')); assert.ok(!run.error().includes('CANARY'));
  }
});
