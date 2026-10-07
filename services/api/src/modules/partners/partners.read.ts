import { NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
export type Database = Pool | PoolClient;
// Shared eligibility for publication, profile and search. An inactive ancestor hides a skill.
export const visibleSkills = `WITH RECURSIVE visible_categories AS (
 SELECT id FROM categories WHERE parent_id IS NULL AND active
 UNION ALL SELECT c.id FROM categories c JOIN visible_categories p ON c.parent_id=p.id WHERE c.active
), visible_skills AS (
 SELECT s.* FROM skills s WHERE s.active AND EXISTS(SELECT 1 FROM skill_categories sc
 JOIN visible_categories c ON c.id=sc.category_id WHERE sc.skill_id=s.id)
)`;
export async function readManagement(db: Database, id: string) {
  const {
    rows: [p]
  } = await db.query(
    `SELECT id,kind,name,bio,verification_status,publication_status,accepting_jobs,moderation_status,version,
    COALESCE(profile->>'phone','') AS phone,COALESCE(profile->>'zalo','') AS zalo FROM partners WHERE id=$1 AND archived_at IS NULL`,
    [id]
  );
  if (!p) throw new NotFoundException();
  const skills = (
    await db.query(
      `SELECT skill_id,modes,reference_labor::text,inspection_fee::text,travel_fee::text FROM partner_skills WHERE partner_id=$1 AND active ORDER BY skill_id`,
      [id]
    )
  ).rows;
  const areas = (
    await db.query(
      `SELECT label,json_build_object('latitude',ST_Y(center::geometry),'longitude',ST_X(center::geometry)) AS center,
    radius_m,ST_AsGeoJSON(boundary)::json AS boundary_geojson FROM service_areas WHERE partner_id=$1 AND active ORDER BY created_at,id`,
      [id]
    )
  ).rows;
  const locations = (
    await db.query(
      `SELECT json_build_object('text',address_text,'point',json_build_object('latitude',ST_Y(point::geometry),'longitude',ST_X(point::geometry))) AS address,
    public FROM partner_locations WHERE partner_id=$1 AND active ORDER BY created_at,id`,
      [id]
    )
  ).rows;
  return { ...p, skills, areas, locations };
}
