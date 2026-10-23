import { test as base } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { Writable } from 'node:stream';
import { createApp } from '../../../services/api/dist/src/bootstrap.js';
import { AppLog } from '../../../services/api/dist/src/logging/logger.js';
import { migrate } from '../../../services/api/dist/src/database/migrate.js';
import { seed } from '../../../services/api/dist/src/database/seed.js';
export const test = base.extend({
  realtime: [false, {option:true}],
  teamLocal: [false, {option:true}],
  adminLocal: [false, {option:true}],
  financeLocal: [false, {option:true}],
  environment: async ({teamLocal,realtime,adminLocal,financeLocal,context}, use, testInfo) => {
    const url = process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
    if (new URL(url).pathname !== '/dvqb_test') throw Error('E2E requires dvqb_test');
    const schema = `web_${randomUUID().replaceAll('-', '')}`;
    const directory = resolve('.local', schema);
    const admin = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
    const logs = [];
    const log = new AppLog(new Writable({ write(chunk, _, done) { logs.push(chunk.toString()); done(); } }), 'debug', 'test');
    let app, server, created = false;
    try {
      await admin.query(`CREATE SCHEMA ${schema}`); created = true;
      await migrate(pool); await seed(pool);
      server = createServer(async (req, res) => {
        try {
          const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
          const file = resolve(directory, '.' + (name === '/' ? '/index.html' : name === '/admin/' ? '/admin/index.html' : name));
          if (!file.startsWith(directory + '/')) { res.writeHead(403).end(); return; }
          res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(file)] ?? 'application/octet-stream');
          res.end(await readFile(file));
        } catch { res.writeHead(404).end(); }
      });
      await new Promise(r => server.listen(0, '127.0.0.1', r));
      const webUrl = `http://127.0.0.1:${server.address().port}`;
      const localAssets = {directory: directory + '-assets', origin: 'http://127.0.0.1'};
      const localMessages = teamLocal ? {secret:'web-local-messages-secret-'.repeat(3),contacts:['owner@example.test','worker@example.test','+84900000001'],mailpit:'http://127.0.0.1:1',smsDirectory:directory+'-sms'} : undefined;
      app = await createApp({finance:financeLocal?{secret:"web-local-finance-secret-".repeat(3)}:undefined,admin:adminLocal?{secret:"web-admin-private-secret-".repeat(3)}:undefined,realtimeEnabled:realtime,localMessages,localAssets, databaseUrl: url, cursorSecret: 'test-secret-'.repeat(4), authSecret: 'isolated-web-auth-secret-'.repeat(3), port: 0, host: '127.0.0.1', corsOrigin: webUrl }, pool, log);
      await app.listen(0, '127.0.0.1');
      localAssets.origin = await app.getUrl();
      const apiUrl = await app.getUrl() + '/v1';
      if (!(await fetch(apiUrl + '/ready')).ok) throw Error('API readiness failed');
      execFileSync('npm', ['exec','-w','apps/mobile','--','expo','export','--clear','--platform','web','--output-dir',directory], { stdio: 'pipe', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_GEOAPIFY_MAPS_KEY: 'test-only', EXPO_PUBLIC_REALTIME_ENABLED:realtime?'1':'0', EXPO_PUBLIC_API_URL: apiUrl } });
      if(adminLocal) execFileSync('npm',['exec','-w','apps/admin','--','vite','build','--base','/admin/','--outDir',directory+'/admin'],{stdio:'pipe',env:{...process.env,VITE_API_URL:apiUrl}});
      await use({ webUrl, apiUrl, pool, app, logs });
    } finally {
      try { await testInfo.attach('api-log.jsonl', { body: logs.join(''), contentType: 'application/x-ndjson' }); }
      finally {
        try { await base.step('Close test API', async () => {
          // Tests are finished. Stop new polling/reconnects before closing sockets:
          // otherwise the still-open page can create another connection during shutdown.
          // Keep the page for Playwright's failure screenshots and trace snapshots.
          await context.route('**/*', route => route.abort());
          await context.routeWebSocket('**/*', socket => socket.close());
          app?.getHttpServer().closeAllConnections();
          await app?.close();
        }); } finally {
          try { await base.step('Close test web server', async () => { server?.closeAllConnections(); await new Promise(r => server ? server.close(r) : r()); }); } finally {
            try { await base.step('Close test DB pool', async () => { await pool.end(); }); } finally {
              try { if (created) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } finally { await admin.end(); await rm(directory, { recursive: true, force: true }); await rm(directory+'-assets', {recursive:true,force:true}); await rm(directory+'-sms', {recursive:true,force:true}); }
            }
          }
        }
      }
    }
  },
});
export { expect } from '@playwright/test';
