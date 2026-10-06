import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
export function stableId(code: string) {
  const hex = createHash('sha256').update(`dvqb:catalog:v1:${code}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export type CatalogSeed = {
  categories: { code: string; name_vi: string; parent_code: string | null; translations: Record<string, string>; scope_vi?: string }[];
  skills: { code: string; name_vi: string; category_codes: string[]; translations: Record<string, string> }[];
};

// This is the curated seed policy, not a global restriction on the N–N schema.
export function validateCatalog(data: CatalogSeed) {
  const categories = new Map(data.categories.map(c => [c.code, c]));
  if (!data.categories.length || !data.skills.length || categories.size !== data.categories.length) throw new Error('Invalid catalog categories');
  for (const c of data.categories) {
    if (c.parent_code !== null && (!categories.has(c.parent_code) || categories.get(c.parent_code)!.parent_code !== null || !c.scope_vi?.trim())) throw new Error('Catalog requires industry/group tree and explicit group scope');
  }
  for (const items of [data.categories, data.skills]) {
    const codes = new Set<string>();
    const names = { vi: new Set<string>(), en: new Set<string>(), ja: new Set<string>() };
    for (const item of items) {
      if (!/^[a-z][a-z0-9_]*$/.test(item.code) || codes.has(item.code)) throw new Error('Duplicate or invalid catalog code');
      codes.add(item.code);
      for (const locale of ['vi', 'en', 'ja'] as const) {
        const value = locale === 'vi' ? item.name_vi : item.translations[locale];
        const name = value?.normalize('NFKC').trim().toLocaleLowerCase();
        if (!name || names[locale].has(name)) throw new Error('Missing or duplicate catalog name');
        names[locale].add(name);
      }
    }
  }
  const used = new Set<string>();
  for (const s of data.skills) {
    const group = categories.get(s.category_codes[0]);
    if (s.category_codes.length !== 1 || !group?.parent_code) throw new Error('Each seeded skill requires exactly one leaf group');
    used.add(group.code);
  }
  if (data.categories.some(c => c.parent_code !== null && !used.has(c.code))) throw new Error('Empty catalog group');
  if (data.categories.some(c => c.parent_code === null && !data.categories.some(g => g.parent_code === c.code))) throw new Error('Empty catalog industry');
}

export async function seed(pool: Pool, options: { replaceCatalog?: boolean } = {}) {
  const data: CatalogSeed = JSON.parse(await readFile(new URL('../../seeds/catalog.json', import.meta.url), 'utf8'));
  validateCatalog(data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(2809202602)');
    if (options.replaceCatalog) {
      const database = (await client.query('SELECT current_database() AS name')).rows[0].name;
      if (!['dvqb_local', 'dvqb_test'].includes(database)) throw new Error('Catalog replacement requires a local development/test database');
      await client.query('LOCK TABLE categories, skills, skill_categories IN ACCESS EXCLUSIVE MODE');
      // Fail closed even for cascading FKs: never erase partner/job data indirectly.
      const references = await client.query(`SELECT 1 FROM pg_constraint WHERE contype='f'
        AND confrelid IN ('categories'::regclass,'skills'::regclass,'skill_categories'::regclass)
        AND conrelid NOT IN ('categories'::regclass,'skills'::regclass,'skill_categories'::regclass)`);
      if (references.rowCount) throw new Error('Catalog has external references; replacement refused');
      await client.query('DELETE FROM skill_categories');
      await client.query('DELETE FROM skills');
      // Remove leaves first to respect the self-referencing RESTRICT foreign key.
      let removed: number;
      do {
        removed = (await client.query('DELETE FROM categories c WHERE NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id=c.id)')).rowCount!;
      } while (removed > 0);
    }
    // Existing values win, including intentionally blank translations. Seed only
    // fills missing keys; names, visibility, tree and form edits remain untouched.
    for (const c of data.categories) await client.query(`INSERT INTO categories(id,code,name_vi,parent_id,translations) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(id) DO UPDATE SET translations = EXCLUDED.translations || categories.translations
      WHERE categories.translations IS DISTINCT FROM EXCLUDED.translations || categories.translations`, [stableId(c.code),c.code,c.name_vi,c.parent_code ? stableId(c.parent_code) : null,c.translations]);
    for (const s of data.skills) {
      await client.query(`INSERT INTO skills(id,code,name_vi,translations) VALUES($1,$2,$3,$4)
        ON CONFLICT(id) DO UPDATE SET translations = EXCLUDED.translations || skills.translations
        WHERE skills.translations IS DISTINCT FROM EXCLUDED.translations || skills.translations`, [stableId(s.code),s.code,s.name_vi,s.translations]);
      for (const code of s.category_codes) await client.query('INSERT INTO skill_categories(id,skill_id,category_id) VALUES($1,$2,$3) ON CONFLICT(skill_id,category_id) DO NOTHING', [stableId(`${s.code}:${code}`),stableId(s.code),stableId(code)]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
