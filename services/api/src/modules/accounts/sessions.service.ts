import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import type { Cursor } from '../../common/http/cursor.js';
import { AccountTransaction } from './account-transaction.js';
import type { PageInput } from './accounts.input.js';
export class SessionsService {
  private readonly tx: AccountTransaction;
  constructor(private readonly pool: Pool, private readonly auth: AuthService, private readonly cursor: Cursor) { this.tx = new AccountTransaction(pool, auth); }
  async list(header: string | undefined, query: PageInput) {
    const { user, sessionId } = await this.auth.authenticate(header), scope = `sessions:${user.id}`;
    const position = this.cursor.decode(query.cursor, scope);
    // One stable entry per login, not a new device row for every token rotation.
    const { rows } = await this.pool.query(`WITH families AS (
      SELECT family_id id,min(created_at) created_at,max(last_seen_at) last_seen_at,
        bool_or(id=$2) is_current,
        CASE WHEN bool_or(revoked_at IS NULL AND expires_at>clock_timestamp()) THEN 'active'
          WHEN bool_or(revoked_at IS NULL) THEN 'expired' ELSE 'revoked' END state
      FROM sessions WHERE user_id=$1 GROUP BY family_id
    ) SELECT id,created_at::text,last_seen_at, is_current,state FROM families
      WHERE ($3::timestamptz IS NULL OR (created_at,id)>($3::timestamptz,$4::uuid)) ORDER BY created_at,id LIMIT $5`,
    [user.id,sessionId,position?.created_at ?? null,position?.id ?? null,query.limit+1]);
    const page = rows.slice(0,query.limit), last = page.at(-1);
    return { items: page.map(r => ({ ...r, created_at: new Date(r.created_at).toISOString(), version: 1 })), next_cursor: rows.length>query.limit && last ? this.cursor.encode({ id: last.id, created_at: last.created_at }, scope) : null };
  }
  revoke(header: string | undefined, id: string, key: string) {
    return this.tx.run(header, 'revokeSession', key, { id }, async (db, { user }) => {
      const result = await db.query('UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND family_id=$2 RETURNING id', [user.id,id]);
      if (!result.rowCount) throw new NotFoundException();
      return { id, version: 1, state: 'revoked' };
    });
  }
}
