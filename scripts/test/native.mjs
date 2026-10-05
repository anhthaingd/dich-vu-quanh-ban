import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import { createApp } from '../../services/api/dist/src/bootstrap.js';
import { AppLog } from '../../services/api/dist/src/logging/logger.js';
import { migrate } from '../../services/api/dist/src/database/migrate.js';
import { seed } from '../../services/api/dist/src/database/seed.js';
import { CatalogService } from '../../services/api/dist/src/modules/catalog/catalog.service.js';
import { requireTestDatabase } from './native-options.mjs';
/* global AbortSignal */

// Maestro 2.11+: DEVICE_ID=<adb serial or simulator UUID> npm run test:native -- android|ios
// APP_BINARY optionally reinstalls an existing development build. This runner
// owns only its Metro/API/processes and an isolated schema in dvqb_test.
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) throw Error('Use android or ios');
const flow = process.argv[3] ?? 'catalog';
if (!['catalog', 'auth', 'i18n', 'i18n-layout', 'shell'].includes(flow)) throw Error('Use catalog, auth, i18n, i18n-layout or shell flow');
const directory = resolve('test-results/native', platform, flow === 'catalog' ? '.' : flow);
await mkdir(directory, { recursive: true });
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000, env: { ...process.env, MAESTRO_CLI_NO_ANALYTICS: '1' } });
const check = (cmd, args) => {
  const result = run(cmd, args);
  if (result.status !== 0) throw Error(`${cmd} failed: ${result.stderr || result.error || result.stdout}`);
  return result.stdout;
};
const maestro = process.env.MAESTRO_BIN ?? (existsSync(`${homedir()}/.local/bin/maestro`) ? `${homedir()}/.local/bin/maestro` : 'maestro');
const appId = 'vn.dichvuquanhban.app';
const device = process.env.DEVICE_ID;
let url;
await writeFile(`${directory}/result.json`, JSON.stringify({ status: 'RUNNING', platform, device }, null, 2));
try {
  url = requireTestDatabase(process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test');
  if (!device) throw Error('Set DEVICE_ID explicitly; the runner never picks another device');
  check(maestro, ['--version']);
  if (platform === 'android') {
    if (check('adb', ['-s', device, 'get-state']).trim() !== 'device') throw Error('Android device is not online');
    if (check('adb', ['-s', device, 'shell', 'getprop', 'sys.boot_completed']).trim() !== '1') throw Error('Wait for Android to finish booting');
    // Android allows one UiAutomation owner. Release only Mobile MCP's helper;
    // its next MCP call starts it again. Do not drive this device via MCP while
    // Maestro is running. Leave all app/system processes untouched.
    const processes = check('adb', ['-s', device, 'shell', 'ps', '-A', '-o', 'PID,ARGS']);
    for (const line of processes.split('\n')) {
      const match = line.match(/^\s*(\d+)\s+app_process\s+\/\s+com\.mobilenext\.mobilecli\.DeviceServer\s*$/);
      if (match) check('adb', ['-s', device, 'shell', 'kill', match[1]]);
    }
  } else {
    const devices = JSON.parse(check('xcrun', ['simctl', 'list', 'devices', 'booted', '--json']));
    if (!Object.values(devices.devices).flat().some(item => item.udid === device)) throw Error('Requested simulator is not booted');
  }
  if (process.env.APP_BINARY) {
    if (!existsSync(process.env.APP_BINARY)) throw Error('APP_BINARY does not exist');
    if (platform === 'android') check('adb', ['-s', device, 'install', '-r', process.env.APP_BINARY]);
    else check('xcrun', ['simctl', 'install', device, process.env.APP_BINARY]);
  }
  if (platform === 'android') {
    if (!check('adb', ['-s', device, 'shell', 'pm', 'path', appId]).includes('package:')) throw Error('Install the Android development build first');
  } else check('xcrun', ['simctl', 'get_app_container', device, appId]);
  await writeFile(`${directory}/preflight.json`, JSON.stringify({ status: 'PASS', platform, device }, null, 2));
} catch (error) {
  const result = JSON.stringify({ status: 'BLOCKED', platform, reason: error.message }, null, 2);
  await writeFile(`${directory}/preflight.json`, result);
  await writeFile(`${directory}/result.json`, result);
  console.error(error.message); process.exit(2);
}

const schema = `native_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
const apiLog = createWriteStream(`${directory}/api.jsonl`);
const metroLog = createWriteStream(`${directory}/metro.log`);
const metroPort = platform === 'android' ? 8083 : 8084;
const host = '127.0.0.1';
const reversedPorts = [];
let app, control, metro, maestroProcess, created = false;
let outcome;
let originalTextSize;
let aborted = false;
const interrupt = () => { aborted = true; maestroProcess?.kill('SIGTERM'); };
process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
const listen = (server, port = 0, host = '127.0.0.1') => new Promise((done, reject) => { server.once('error', reject); server.listen(port, host, done); });
const close = server => new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
const devLink = port => `exp+dich-vu-quanh-ban://expo-development-client/?url=${encodeURIComponent(`http://${platform === 'ios' ? 'localhost' : host}:${port}`)}`;
try {
  if (flow === 'i18n-layout') {
    originalTextSize = platform === 'android'
      ? check('adb', ['-s', device, 'shell', 'settings', 'get', 'system', 'font_scale']).trim()
      : check('xcrun', ['simctl', 'ui', device, 'content_size']).trim();
    if (platform === 'android') check('adb', ['-s', device, 'shell', 'settings', 'put', 'system', 'font_scale', '1.5']);
    else check('xcrun', ['simctl', 'ui', device, 'content_size', 'extra-extra-extra-large']);
  }
  const probe = createServer(); await listen(probe, metroPort, '::'); await close(probe);
  await admin.query(`CREATE SCHEMA ${schema}`); created = true;
  await migrate(pool); await seed(pool);
  const active = (await pool.query('SELECT id FROM categories WHERE active=true')).rows.map(row => row.id);
  app = await createApp({ databaseUrl: url, cursorSecret: randomUUID().repeat(2), authSecret: randomUUID().repeat(2), port: 0, host: '127.0.0.1' }, pool, new AppLog(apiLog, 'info', 'test'));
  await app.listen(0, '127.0.0.1');
  const apiPort = app.getHttpServer().address().port;
  if (platform === 'android') {
    for (const port of [metroPort, apiPort]) {
      check('adb', ['-s', device, 'reverse', '--no-rebind', `tcp:${port}`, `tcp:${port}`]);
      reversedPorts.push(port);
    }
  }
  const service = app.get(CatalogService);
  const original = service.list.bind(service);
  const key = randomUUID();
  control = createServer(async (req, res) => {
    try {
      const mode = req.url?.slice(`/${key}/`.length);
      if (req.method !== 'POST' || !req.url?.startsWith(`/${key}/`) || !['ok', 'error', 'empty'].includes(mode)) { res.writeHead(404).end(); return; }
      service.list = mode === 'error' ? async () => { throw Error('native-test-failure'); } : original;
      await pool.query('UPDATE categories SET active = (id = ANY($1::uuid[]))', [mode === 'empty' ? [] : active]);
      res.writeHead(200).end('ok');
    } catch { res.writeHead(500).end('Test setup failed'); }
  });
  await listen(control);
  metro = spawn(process.execPath, ['../../node_modules/expo/bin/cli', 'start', '--dev-client', '--host', 'lan', '--port', String(metroPort)], {
    cwd: resolve('apps/mobile'), detached: true,
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_URL: `http://${host}:${apiPort}/v1`, EXPO_PUBLIC_AUTH_STORAGE_NAMESPACE: 'native-test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  metro.stdout.pipe(metroLog, { end: false }); metro.stderr.pipe(metroLog, { end: false });
  const deadline = Date.now() + 120000;
  while (true) {
    if (aborted) throw Error('Interrupted');
    if (metro.exitCode !== null || Date.now() > deadline) throw Error('Test Metro failed to start; inspect metro.log');
    try { if ((await fetch(`http://localhost:${metroPort}/status`, { signal: AbortSignal.timeout(1500) })).ok) break; } catch { /* starting */ }
    await delay(500);
  }
  const result = await new Promise((done, reject) => {
    maestroProcess = spawn(maestro, ['--device', device, 'test', '-e', `APP_ID=${appId}`, '-e', `DEV_URL=${devLink(metroPort)}`,
      '-e', `TEST_CONTROL_URL=http://127.0.0.1:${control.address().port}/${key}`,
      '-e', `TEST_EMAIL=native-${randomUUID()}@example.test`, '-e', 'TEST_PASSWORD=native-test-only-password',
      '--format', 'junit', '--output', `${directory}/junit.xml`,
      '--test-output-dir', directory, `tests/e2e/native/${flow}.yaml`], {
      env: { ...process.env, MAESTRO_CLI_NO_ANALYTICS: '1' }, stdio: 'inherit',
    });
    const timeout = setTimeout(() => { maestroProcess.kill('SIGTERM'); reject(Error('Native test timed out')); }, 480000);
    maestroProcess.once('error', error => { clearTimeout(timeout); reject(error); });
    maestroProcess.once('close', code => { clearTimeout(timeout); done(code ?? 1); });
  });
  if (aborted || result !== 0) throw Error(`Maestro failed (${result}); inspect ${directory}`);
  outcome = { status: 'PASS', platform, device, schema, scenarios: flow === 'shell' ? ['catalog', 'back', 'resume', 'error-retry', 'empty-recovery', 'account-return-to-category', 'catalog-root', 'shell-vi-en-ja'] : flow === 'i18n-layout' ? ['large-text-english', 'large-text-japanese', 'scrollable-form'] : flow === 'i18n' ? ['locale-switch', 'form-retention', 'localized-auth-error', 'locale-cold-start', 'catalog-fallback', 'translated-error-retry'] : flow === 'auth' ? ['register', 'secure-restore', 'login-error-retry', 'logout'] : ['catalog', 'back', 'resume', 'error-retry', 'empty-recovery'] };
} catch (error) {
  outcome = { status: 'FAIL', platform, device, reason: error.message };
  console.error(error.message); process.exitCode = 1;
} finally {
  try {
    // Restore font settings even when a layout assertion fails.
    try {
      if (originalTextSize !== undefined) {
        if (platform === 'android') {
          const action = originalTextSize === 'null' ? ['delete', 'system', 'font_scale'] : ['put', 'system', 'font_scale', originalTextSize];
          check('adb', ['-s', device, 'shell', 'settings', ...action]);
        } else check('xcrun', ['simctl', 'ui', device, 'content_size', originalTextSize]);
      }
    } catch (error) {
      outcome = { ...outcome, status: 'FAIL', fontRestoreError: error.message };
      process.exitCode = 1;
    }
    // Restore the user's development server only if it is still available.
    const originalPort = platform === 'android' ? 8081 : 8082;
    try {
      if ((await fetch(`http://localhost:${originalPort}/status`, { signal: AbortSignal.timeout(1500) })).ok) {
        if (platform === 'android') {
          const reversed = check('adb', ['-s', device, 'reverse', '--list']).split('\n').some(line => line.trim().endsWith(`tcp:${originalPort} tcp:${originalPort}`));
          const originalHost = reversed ? '127.0.0.1' : '10.0.2.2';
          run('adb', ['-s', device, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `exp+dich-vu-quanh-ban://expo-development-client/?url=${encodeURIComponent(`http://${originalHost}:${originalPort}`)}`, appId]);
        }
        else run('xcrun', ['simctl', 'openurl', device, devLink(originalPort)]);
      }
    } catch { /* the user may have stopped Metro */ }
    for (const port of reversedPorts) run('adb', ['-s', device, 'reverse', '--remove', `tcp:${port}`]);
    if (metro?.pid) {
      try { process.kill(-metro.pid, 'SIGTERM'); } catch { /* already exited */ }
    }
    try { if (control) await close(control); }
    finally {
      try { await app?.close(); }
      finally {
        try { await pool.end(); }
        finally {
          try { if (created) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
          finally { await admin.end(); apiLog.end(); metroLog.end(); }
        }
      }
    }
  } catch (error) {
    outcome = { ...outcome, status: 'FAIL', cleanupError: error.message };
    console.error(`Native cleanup failed: ${error.message}`); process.exitCode = 1;
  } finally {
    process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  }
}
await writeFile(`${directory}/result.json`, JSON.stringify({ ...outcome, finishedAt: new Date().toISOString() }, null, 2));
if (outcome.status === 'PASS') console.log(`PASS native ${platform} ${flow}: ${outcome.scenarios.join(', ')}; test schema removed`);
