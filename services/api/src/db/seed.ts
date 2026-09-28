import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
export function stableId(code: string) {
  const hex = createHash('sha256').update(`dvqb:catalog:v1:${code}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export async function seed(pool: Pool) {
  const data: { categories: { code: string; name_vi: string; parent_code: string | null }[]; skills: { code: string; name_vi: string; category_codes: string[] }[] } = JSON.parse(await readFile(new URL('../../seeds/catalog.json', import.meta.url), 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(2809202602)');
    for (const c of data.categories) await client.query('INSERT INTO categories(id,code,name_vi,parent_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING', [stableId(c.code),c.code,c.name_vi,c.parent_code ? stableId(c.parent_code) : null]);
    for (const s of data.skills) {
      await client.query('INSERT INTO skills(id,code,name_vi) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING', [stableId(s.code),s.code,s.name_vi]);
      for (const code of s.category_codes) await client.query('INSERT INTO skill_categories(id,skill_id,category_id) VALUES($1,$2,$3) ON CONFLICT(skill_id,category_id) DO NOTHING', [stableId(`${s.code}:${code}`),stableId(s.code),stableId(code)]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
