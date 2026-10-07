import type { Pool } from 'pg';
import { AppLog } from '../../logging/logger.js';
import { databaseOperation } from '../../database/operation.js';
import { visibleSkills } from '../partners/partners.read.js';
import { SearchCursor, type SearchQuery } from './search.query.js';
export class SearchService {
  constructor(
    private readonly pool: Pool,
    private readonly cursor: SearchCursor,
    private readonly log: AppLog
  ) {}
  async list(q: SearchQuery) {
    const after = this.cursor.decode(q);
    const { rows } = await databaseOperation(this.log, 'partners.search', () =>
      this.pool.query(
        `${visibleSkills},
      selected_categories AS (
        SELECT id FROM visible_categories WHERE id=$5::uuid
        UNION ALL SELECT c.id FROM categories c JOIN selected_categories p ON c.parent_id=p.id WHERE c.active
      ), point AS (SELECT ST_SetSRID(ST_MakePoint($1,$2),4326)::geography AS point),
      matched_skills AS (
        SELECT ps.* FROM partner_skills ps JOIN visible_skills s ON s.id=ps.skill_id
        WHERE ps.active AND ($4::uuid IS NULL OR ps.skill_id=$4) AND ($6::text IS NULL OR $6=ANY(ps.modes))
        AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM skill_categories sc JOIN selected_categories c ON c.id=sc.category_id WHERE sc.skill_id=ps.skill_id))
      ), eligible AS (
        SELECT p.* FROM partners p WHERE p.publication_status='published' AND p.accepting_jobs AND p.moderation_status='active'
        AND p.archived_at IS NULL AND (NOT $7::boolean OR p.verification_status='verified')
      ), candidates AS (
        SELECT p.id,p.created_at,ST_Distance(l.point,x.point) AS distance_m,'shop'::text AS distance_kind,ps.reference_labor
        FROM eligible p JOIN matched_skills ps ON ps.partner_id=p.id JOIN partner_locations l ON l.partner_id=p.id CROSS JOIN point x
        WHERE l.active AND l.public AND 'at_shop'=ANY(ps.modes) AND ($6::text IS NULL OR $6='at_shop') AND ST_DWithin(l.point,x.point,$3)
        UNION ALL
        SELECT p.id,p.created_at,ST_Distance(a.center,x.point),'service_area'::text,ps.reference_labor
        FROM eligible p JOIN matched_skills ps ON ps.partner_id=p.id JOIN service_areas a ON a.partner_id=p.id CROSS JOIN point x
        WHERE a.active AND a.center IS NOT NULL AND ps.modes && ARRAY['at_customer','custom']::text[]
        AND ($6::text IS NULL OR $6 IN ('at_customer','custom')) AND ST_DWithin(a.center,x.point,a.radius_m) AND ST_DWithin(a.center,x.point,$3)
      ), best AS (
        SELECT DISTINCT ON(id) id,created_at,distance_m,distance_kind,reference_labor FROM candidates
        ORDER BY id,distance_m,distance_kind,reference_labor NULLS LAST
      )
      SELECT p.id,p.name,p.kind,p.verification_status,b.distance_m,b.distance_kind,b.reference_labor::text,
        NULL::numeric AS stars,0 AS review_count,b.created_at::text
      FROM best b JOIN partners p ON p.id=b.id
      WHERE ($8::double precision IS NULL OR (b.distance_m,b.created_at,b.id)>($8::double precision,$9::timestamptz,$10::uuid))
      ORDER BY b.distance_m,b.created_at,b.id LIMIT $11`,
        [
          q.longitude,
          q.latitude,
          q.radius,
          q.skill,
          q.category,
          q.mode,
          q.verified,
          after?.distance_m ?? null,
          after?.created_at ?? null,
          after?.id ?? null,
          q.limit + 1
        ]
      )
    );
    const page = rows.slice(0, q.limit),
      last = page.at(-1);
    return {
      items: page.map((row) => {
        const p = { ...row };
        delete p.created_at;
        return p;
      }),
      next_cursor:
        rows.length > q.limit && last
          ? this.cursor.encode(
              {
                id: last.id,
                created_at: last.created_at,
                distance_m: last.distance_m
              },
              q
            )
          : null
    };
  }
}
