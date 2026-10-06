import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import type { Cursor } from '../../common/http/cursor.js';
import { AccountTransaction } from './account-transaction.js';
import type { AddressInput, PageInput } from './accounts.input.js';
const fields = `id,label,address_text,ST_Y(point::geometry) lat,ST_X(point::geometry) lng,is_default,version,created_at::text`;
type Row = { id: string; label: string; address_text: string; lat: number; lng: number; is_default: boolean; version: number; created_at: string };
const present = (r: Row) => ({ id: r.id, label: r.label, address: { text: r.address_text, point: { latitude: r.lat, longitude: r.lng } }, is_default: r.is_default, version: r.version });
export class AddressesService {
  private readonly tx: AccountTransaction;
  constructor(private readonly pool: Pool, private readonly auth: AuthService, private readonly cursor: Cursor) { this.tx = new AccountTransaction(pool, auth); }
  async list(header: string | undefined, query: PageInput) {
    const { user } = await this.auth.authenticate(header), scope = `addresses:${user.id}`;
    const position = this.cursor.decode(query.cursor, scope);
    const { rows } = await this.pool.query<Row>(`SELECT ${fields} FROM saved_addresses WHERE user_id=$1 AND archived_at IS NULL
      AND ($2::timestamptz IS NULL OR (created_at,id)>($2::timestamptz,$3::uuid)) ORDER BY created_at,id LIMIT $4`, [user.id, position?.created_at ?? null, position?.id ?? null, query.limit+1]);
    const page = rows.slice(0, query.limit), last = page.at(-1);
    return { items: page.map(present), next_cursor: rows.length > query.limit && last ? this.cursor.encode({ id: last.id, created_at: last.created_at }, scope) : null };
  }
  save(header: string | undefined, id: string | null, input: AddressInput, key: string) {
    return this.tx.run(header, id ? 'editAddress' : 'addAddress', key, { id, ...input }, async (db, { user }) => {
      if (id) {
        const { rows: [row] } = await db.query('SELECT version FROM saved_addresses WHERE id=$1 AND user_id=$2 AND archived_at IS NULL', [id, user.id]);
        if (!row) throw new NotFoundException();
        if (row.version !== input.expected_version) throw new ConflictException({ code: 'VERSION_CONFLICT' });
      }
      const { rows: [count] } = await db.query('SELECT count(*)::int n FROM saved_addresses WHERE user_id=$1 AND archived_at IS NULL', [user.id]);
      const makeDefault = input.is_default || (!id && count.n === 0);
      if (makeDefault) await db.query('UPDATE saved_addresses SET is_default=false,version=version+1 WHERE user_id=$1 AND is_default AND archived_at IS NULL AND id IS DISTINCT FROM $2::uuid', [user.id, id]);
      const values = [user.id, input.label, input.address.text, input.address.point.longitude, input.address.point.latitude, makeDefault];
      const { rows: [saved] } = id
        ? await db.query<Row>(`UPDATE saved_addresses SET label=$2,address_text=$3,point=ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,is_default=$6,version=version+1 WHERE user_id=$1 AND id=$7 RETURNING ${fields}`, [...values,id])
        : await db.query<Row>(`INSERT INTO saved_addresses(user_id,label,address_text,point,is_default) VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6) RETURNING ${fields}`, values);
      return present(saved);
    });
  }
  archive(header: string | undefined, id: string, key: string) {
    return this.tx.run(header, 'archiveAddress', key, { id }, async (db, { user }) => {
      const { rows: [row] } = await db.query(`UPDATE saved_addresses SET archived_at=COALESCE(archived_at,now()),is_default=false,
        version=version+CASE WHEN archived_at IS NULL THEN 1 ELSE 0 END WHERE id=$1 AND user_id=$2 RETURNING id,version`, [id,user.id]);
      if (!row) throw new NotFoundException();
      return { ...row, state: 'archived' };
    });
  }
}
