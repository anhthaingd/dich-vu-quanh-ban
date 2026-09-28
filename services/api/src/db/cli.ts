import { Pool } from 'pg';
import { migrate } from './migrate.js';
import { seed } from './seed.js';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
try {
  if (process.argv[2] === 'migrate') await migrate(pool);
  else if (process.argv[2] === 'seed' && ['development','test'].includes(process.env.NODE_ENV ?? '')) await seed(pool);
  else throw new Error('Seed requires NODE_ENV=development or test');
  console.log('Database operation completed');
} catch {
  console.error('Database operation failed. Check configuration, migration checksums and data constraints.');
  process.exitCode = 1;
} finally { await pool.end(); }
