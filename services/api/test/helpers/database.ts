import type {LocalMessagesConfig} from '../../src/integrations/local-messages.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../../src/bootstrap.js';
import { migrate } from '../../src/database/migrate.js';
import { seed } from '../../src/database/seed.js';
import { captureLogs } from './logs.js';
export async function databaseFixture(authSecret?: string, assets = false, localMessages?:LocalMessagesConfig) {
  const connectionString = process.env.TEST_DATABASE_URL ?? 'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
  if (new URL(connectionString).pathname !== '/dvqb_test') throw new Error('Integration requires isolated database dvqb_test');
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
  const pool = new Pool({ connectionString, options: `-c search_path=${schema},public`, statement_timeout: 5000, connectionTimeoutMillis: 3000 });
  const localAssets = assets ? {directory:await mkdtemp(join(tmpdir(),'dvqb-assets-')),origin:'http://127.0.0.1'} : undefined;
  const logs = captureLogs();
  let app: INestApplication | undefined;
  let created = false;
  const close = async () => {
    try { await app?.close(); } finally {
      try { await pool.end(); } finally {
        try { if (created) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } finally { await admin.end(); if(localAssets)await rm(localAssets.directory,{recursive:true,force:true}); }
      }
    }
  };
  try {
    await admin.query(`CREATE SCHEMA ${schema}`); created = true;
    await migrate(pool); await seed(pool);
    app = await createApp({ localMessages, localAssets, databaseUrl: connectionString, cursorSecret: 'test-secret-'.repeat(4), authSecret, port: 0, host: '127.0.0.1', corsOrigin: 'http://localhost' }, pool, logs.log);
    await app.listen(0, '127.0.0.1');
    if(localAssets)localAssets.origin=await app.getUrl();
    return { pool, app, base: await app.getUrl() + '/v1', logs, close };
  } catch (error) { await close(); throw error; }
}
