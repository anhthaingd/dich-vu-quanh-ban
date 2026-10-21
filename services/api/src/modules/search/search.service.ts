import {BadRequestException} from '@nestjs/common';
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
        AND ($6::text IS NULL OR $6 IN ('at_customer','custom')) AND ((a.boundary IS NULL AND ST_DWithin(a.center,x.point,a.radius_m)) OR (a.boundary IS NOT NULL AND ST_Covers(a.boundary::geometry,x.point::geometry))) AND ST_DWithin(a.center,x.point,$3)
      ), best AS (
        SELECT DISTINCT ON(id) id,created_at,distance_m,distance_kind,reference_labor FROM candidates
        ORDER BY id,distance_m,distance_kind,reference_labor NULLS LAST
      )
      SELECT p.id,p.name,p.kind,p.verification_status,b.distance_m,b.distance_kind,b.reference_labor::text,
        rs.stars,rs.review_count,b.created_at::text,COALESCE(ml.map_location,area_pin.map_location) AS map_location
      FROM best b JOIN partners p ON p.id=b.id
      LEFT JOIN LATERAL (
        SELECT avg(r.stars)::double precision AS stars,count(*)::integer AS review_count
        FROM reviews r JOIN jobs j ON j.id=r.job_id WHERE j.partner_id=p.id
        AND r.direction='customer_to_partner' AND r.hidden_at IS NULL AND r.removed_at IS NULL
      ) rs ON true
      LEFT JOIN LATERAL (
        SELECT json_build_object('text',l.address_text,'point',json_build_object(
          'latitude',ST_Y(l.point::geometry),'longitude',ST_X(l.point::geometry))) AS map_location
        FROM partner_locations l CROSS JOIN point x
        WHERE l.partner_id=p.id AND l.active AND l.public AND ST_DWithin(l.point,x.point,$3)
        ORDER BY ST_Distance(l.point,x.point),l.created_at,l.id LIMIT 1
      ) ml ON true
      LEFT JOIN LATERAL (
        SELECT json_build_object('text',a.label,'point',json_build_object('latitude',ST_Y(a.center::geometry),'longitude',ST_X(a.center::geometry))) AS map_location
        FROM service_areas a CROSS JOIN point x WHERE a.partner_id=p.id AND a.active AND a.boundary IS NOT NULL
        AND b.distance_kind='service_area' AND ST_Covers(a.boundary::geometry,x.point::geometry) AND ST_DWithin(a.center,x.point,$3)
        ORDER BY ST_Distance(a.center,x.point),a.created_at,a.id LIMIT 1
      ) area_pin ON true
      WHERE ($8::double precision IS NULL OR (b.distance_m,b.created_at,b.id)>($8::double precision,$9::timestamptz,$10::uuid))
      ORDER BY b.distance_m,b.created_at,b.id LIMIT NULLIF($11,0)`,
        [
          q.longitude,
          q.latitude,
          q.radius,
          q.skill,
          q.category,
          q.mode,
          q.verified,
          null,
          null,
          null,
          0
        ]
      )
    );
    // Freeze only identity/order. Every later page rechecks current publication,
    // availability, geography and visibility before returning current public data.
    let snapshot=after?.snapshot,ids:string[],offset=after?.offset??0;
    if(snapshot){const saved=(await this.pool.query('SELECT partner_ids FROM search_snapshots WHERE id=$1 AND expires_at>clock_timestamp()',[snapshot])).rows[0];if(!saved)throw new BadRequestException({code:'VALIDATION'});ids=saved.partner_ids;}
    else {
      if(after)throw new BadRequestException();
      if(q.sort!=='distance')rows.sort((a,b)=>{
        if(q.sort==='recommended'){const verified=Number(b.verification_status==='verified')-Number(a.verification_status==='verified');if(verified)return verified;}
        return (b.stars??-1)-(a.stars??-1)||(q.sort==='recommended'?b.review_count-a.review_count:0)||a.distance_m-b.distance_m||String(a.created_at).localeCompare(String(b.created_at))||a.id.localeCompare(b.id);
      });
      ids=rows.map(r=>r.id);snapshot=(await this.pool.query('INSERT INTO search_snapshots(partner_ids) VALUES($1) RETURNING id',[ids])).rows[0].id;
      await this.pool.query('DELETE FROM search_snapshots WHERE expires_at<clock_timestamp()');
    }
    const current=new Map(rows.map(r=>[r.id,r])),page=[];
    while(offset<ids.length&&page.length<q.limit){const r=current.get(ids[offset++]);if(r)page.push(r);}
    const last=page.at(-1);
    return {items:page.map(row=>{const p={...row};delete p.created_at;return p;}),next_cursor:last&&offset<ids.length?this.cursor.encode({id:last.id,created_at:last.created_at,distance_m:last.distance_m,snapshot,offset},q):null};
  }
}
