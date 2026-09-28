import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createApp } from '../../services/api/dist/src/bootstrap.js';
import { AppLog } from '../../services/api/dist/src/logging/logger.js';
import { migrate } from '../../services/api/dist/src/database/migrate.js';
import { seed } from '../../services/api/dist/src/database/seed.js';
const url = process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
if (new URL(url).pathname !== '/dvqb_test') throw Error('Load test requires dvqb_test');
const schema = `load_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: url }); const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 5 });
const records = []; const log = new AppLog(new Writable({ write(chunk, _, done) { records.push(JSON.parse(chunk.toString())); done(); } }), 'info', 'test');
let app, created = false;
try {
  await admin.query(`CREATE SCHEMA ${schema}`); created = true; await migrate(pool); await seed(pool);
  app = await createApp({ databaseUrl: url, cursorSecret: 'load-test-'.repeat(4), port: 0, host: '127.0.0.1' }, pool, log); await app.listen(0,'127.0.0.1');
  const base = await app.getUrl(); const durations = []; const ids = new Set(); const start = performance.now();
  await Promise.all(Array.from({ length: 20 }, async () => {
    for (let i = 0; i < 10; i++) {
      const since = performance.now(); const response = await fetch(base+'/v1/categories?parent_id=root');
      assert.equal(response.status,200); assert.equal((await response.json()).items.length,10);
      durations.push(performance.now()-since); ids.add(response.headers.get('x-request-id'));
    }
  }));
  const elapsedMs = performance.now()-start; durations.sort((a,b)=>a-b);
  assert.equal(ids.size,200); const completed = records.filter(x=>x.event==='http.completed'); assert.equal(completed.length,200); assert.equal(new Set(completed.map(x=>x.request_id)).size,200); assert.equal(pool.waitingCount,0);
  const result = { status:'PASS', dataset:'20 categories, 20 skills, 21 links', requests:200, concurrency:20, errors:0, elapsedMs, p95Ms:durations[189], terminalLogs:completed.length, uniqueIds:ids.size, scope:'local only; not a production SLA' };
  await mkdir('test-results/performance',{recursive:true}); await writeFile('test-results/performance/catalog.json',JSON.stringify(result,null,2)); console.log(result);
} finally {
  try { await app?.close(); } finally { await pool.end(); try { if(created) await admin.query(`DROP SCHEMA ${schema} CASCADE`); } finally { await admin.end(); } }
}
