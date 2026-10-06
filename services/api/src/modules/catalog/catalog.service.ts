import { AppLog } from '../../logging/logger.js';
import { databaseOperation } from '../../database/operation.js';
import { Pool } from 'pg';
import { Cursor, type CatalogQuery } from './catalog.query.js';

// Only categories reachable through an entirely active ancestry may be selected.
const visible = `WITH RECURSIVE visible AS (
  SELECT * FROM categories WHERE parent_id IS NULL AND active
  UNION ALL SELECT c.* FROM categories c JOIN visible p ON c.parent_id = p.id WHERE c.active
)`;
type Row = Record<string, unknown> & { id: string; created_at: string };
export class CatalogService {
  constructor(private readonly pool: Pool, private readonly cursor: Cursor, private readonly log: AppLog) {}
  async list(kind: 'categories' | 'skills', query: CatalogQuery) {
    const scope = `${kind}:${query.filter ?? '*'}:public:${query.locale}`;
    const position = this.cursor.decode(query.cursor, scope);
    const params = [query.filter ?? null, position?.created_at ?? null, position?.id ?? null, query.limit + 1];
    const sql = kind === 'categories' ? `${visible}
      SELECT c.id, c.code, c.name_vi, c.translations, c.parent_id, c.active, c.created_at::text FROM visible c
      WHERE ($1::text IS NULL OR ($1 = 'root' AND c.parent_id IS NULL) OR c.parent_id::text = $1)
      AND ($2::timestamptz IS NULL OR (c.created_at,c.id) > ($2::timestamptz,$3::uuid))
      ORDER BY c.created_at,c.id LIMIT $4` : `${visible}, selected AS (
        SELECT id FROM visible WHERE id::text = $1
        UNION ALL SELECT c.id FROM visible c JOIN selected p ON c.parent_id = p.id
      )
      SELECT s.id,s.code,s.name_vi,s.translations,s.schema_version,s.form_schema,s.created_at::text,
        ARRAY(SELECT sc.category_id FROM skill_categories sc JOIN visible c ON c.id = sc.category_id
          WHERE sc.skill_id = s.id ORDER BY sc.category_id) AS category_ids
      FROM skills s WHERE s.active
      AND EXISTS (SELECT 1 FROM skill_categories sc JOIN visible c ON c.id=sc.category_id
        WHERE sc.skill_id=s.id AND ($1::text IS NULL OR c.id IN (SELECT id FROM selected)))
      AND ($2::timestamptz IS NULL OR (s.created_at,s.id) > ($2::timestamptz,$3::uuid))
      ORDER BY s.created_at,s.id LIMIT $4`;
    const { rows } = await databaseOperation(this.log, `catalog.${kind}`, () => this.pool.query<Row>(sql, params));
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(row => {
        const translated = (row.translations as Record<string, unknown>)[query.locale];
        const hasTranslation = query.locale !== 'vi' && typeof translated === 'string' && translated.trim().length > 0;
        const item: Record<string, unknown> = { ...row,
          name: hasTranslation ? translated : row.name_vi,
          name_locale: hasTranslation ? query.locale : 'vi',
        };
        delete item.created_at; delete item.translations;
        return item;
      }),
      next_cursor: rows.length > query.limit && last ? this.cursor.encode({ id: last.id, created_at: last.created_at }, scope) : null,
    };
  }
}
