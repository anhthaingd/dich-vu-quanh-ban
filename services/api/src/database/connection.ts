import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

export function connectionOptions(connectionString: string, caFile?: string): PoolConfig {
  const url = new URL(connectionString);
  // pg URL ssl parameters can override the explicit ssl object. Reject them.
  if (caFile && [...url.searchParams.keys()].some(key => key.startsWith('ssl'))) throw new Error('Use DATABASE_CA_FILE without URL SSL options');
  return { connectionString, ...(caFile ? { ssl: { ca: readFileSync(caFile, 'utf8'), rejectUnauthorized: true } } : {}) };
}
