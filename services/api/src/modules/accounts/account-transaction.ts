import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';

// Lock ordering is shared by profile, sessions, addresses, refresh and logout.
// The resource and its retry result always commit together.
export class AccountTransaction {
  constructor(private readonly pool: Pool, private readonly auth: AuthService) {}
  async run<T>(header: string | undefined, operation: string, key: string, input: unknown,
    work: (db: PoolClient, actor: Awaited<ReturnType<AuthService['authenticate']>>) => Promise<T>): Promise<T> {
    const actor = await this.auth.authenticate(header);
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [actor.user.id]);
      const current = await this.auth.authenticate(header, db);
      const { rows: [previous] } = await db.query('SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation=$2 AND request_key=$3', [current.user.id, operation, key]);
      if (previous && previous.request_hash !== hash) throw new ConflictException({ code: 'IDEMPOTENCY_MISMATCH' });
      const result: T = previous ? previous.response_snapshot : await work(db, current);
      if (!previous) await db.query(`INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot)
        VALUES($1,$2,$3,$4,'completed',$5::jsonb)`, [current.user.id, operation, key, hash, JSON.stringify(result)]);
      await db.query('COMMIT'); return result;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
}
