import { AppLog } from '../logging/logger.js';
import { Pool } from 'pg';
import { migrate } from './migrate.js';
import { seed } from './seed.js';
const log = new AppLog();
let pool: Pool | undefined;
try {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  if (process.argv[2] === 'migrate') await migrate(pool);
  else if (process.argv[2] === 'seed' && ['development','test'].includes(process.env.NODE_ENV ?? '')) await seed(pool);
  else if (process.argv[2] === 'replace-catalog' && ['development','test'].includes(process.env.NODE_ENV ?? '') && ['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) await seed(pool, { replaceCatalog: true });
  else throw new Error('Unsupported database command or unsafe environment');
  log.emit(process.argv[2] === 'migrate' ? 'db.migration.completed' : process.argv[2] === 'replace-catalog' ? 'db.catalog.replaced' : 'db.seed.completed');
} catch (error) {
  log.emit('db.operation_failed', { error }); process.exitCode = 1;
} finally { await pool?.end(); await log.flush(); }
