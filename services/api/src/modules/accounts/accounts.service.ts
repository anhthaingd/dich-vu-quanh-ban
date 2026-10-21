import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import type { ProfileEdit } from './profile.input.js';

export class AccountsService {
  constructor(private readonly pool: Pool, private readonly auth: AuthService) {}
  async edit(header: string | undefined, input: ProfileEdit, key: string) {
    // Support-only suspended accounts may keep their language preference.
    // Name/profile writes still require an active app session.
    const localeOnly = input.locale !== undefined && input.display_name === undefined;
    const actor = await this.auth.authenticate(header, undefined, localeOnly);
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      // Same lock order as refresh/logout. Recheck the session after waiting.
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [actor.user.id]);
      const { user: current } = await this.auth.authenticate(header, db, localeOnly);
      const { rows: [previous] } = await db.query("SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation='editMe' AND request_key=$2", [current.id, key]);
      if (previous) {
        if (previous.request_hash !== hash) throw new ConflictException({ code: 'IDEMPOTENCY_MISMATCH' });
        await db.query('COMMIT');
        // Snapshot contains only edited fields, never tokens or stored grants.
        return { ...actor.user, ...current, ...previous.response_snapshot };
      }
      if (current.version !== input.expected_version) throw new ConflictException({ code: 'VERSION_CONFLICT' });
      const { rows: [updated] } = await db.query(`UPDATE users SET display_name=COALESCE($2,display_name),locale=COALESCE($3,locale),version=version+1
        WHERE id=$1 RETURNING display_name,locale,version`, [current.id, input.display_name, input.locale]);
      await db.query(`INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,resource_id,response_snapshot)
        VALUES($1,'editMe',$2,$3,'completed',$1,$4::jsonb)`, [current.id, key, hash, JSON.stringify(updated)]);
      await db.query('COMMIT');
      return { ...actor.user, ...current, ...updated };
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
}
