import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { Pool } from 'pg';
import { chromium } from 'playwright';
import { createApp } from '../../services/api/dist/src/app.js';
import { migrate } from '../../services/api/dist/src/db/migrate.js';
import { seed } from '../../services/api/dist/src/db/seed.js';

const url = process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
if (new URL(url).pathname !== '/dvqb_test') throw new Error('Smoke test requires dvqb_test');
const schema = `smoke_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: url });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public` });
let app, server, browser;
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await migrate(pool); await seed(pool);
  app = await createApp({ databaseUrl: url, cursorSecret: 'isolated-smoke-secret-'.repeat(3), port: 0, host: '127.0.0.1', corsOrigin: 'http://127.0.0.1:38081' }, pool);
  await app.listen(0, '127.0.0.1');
  execFileSync('npm', ['exec', '-w', 'apps/mobile', '--', 'expo', 'export', '--clear', '--platform', 'web', '--output-dir', '../../.local/smoke-web'], {
    stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_PUBLIC_API_URL: await app.getUrl() + '/v1' },
  });
  const root = resolve('.local/smoke-web');
  server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + (name === '/' ? '/index.html' : name));
      if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(file)] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(38081, '127.0.0.1', r));
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => console.log('Browser request failed:', r.url(), r.failure()?.errorText));
  const ready = async () => page.getByText('Đang tải danh mục…').waitFor({ state: 'hidden' });
  await page.goto('http://127.0.0.1:38081');
  await page.getByRole('button', { name: 'Điện nước', exact: true }).waitFor();
  await mkdir('docs/implementation/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/implementation/evidence/catalog-root.png', fullPage: true });
  await page.getByRole('button', { name: 'Điện nước', exact: true }).click();
  await page.getByRole('button', { name: 'Dịch vụ điện nước', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Dịch vụ điện nước', exact: true }).click();
  await page.getByRole('heading', { name: 'Dịch vụ điện nước', exact: true }).waitFor();
  await ready();
  await page.getByText('Sửa điện dân dụng', { exact: true }).waitFor();
  await page.screenshot({ path: 'docs/implementation/evidence/catalog-skills.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await page.getByRole('alert').waitFor();
  await page.screenshot({ path: 'docs/implementation/evidence/catalog-error.png', fullPage: true });
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await page.getByRole('button', { name: 'Dịch vụ điện nước', exact: true }).waitFor();
  await pool.query('UPDATE categories SET active=false');
  await page.reload();
  await page.getByText('Chưa có dịch vụ đang hoạt động.').waitFor();
  await page.screenshot({ path: 'docs/implementation/evidence/catalog-empty.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: Expo web → HTTP → PostgreSQL; ngành → nhóm → kỹ năng; offline/retry; empty; 390px; no page errors. Native device not tested.');
} finally {
  await browser?.close();
  await new Promise(r => server ? server.close(r) : r());
  await app?.close(); await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
}
