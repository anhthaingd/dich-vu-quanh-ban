import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { databaseFixture } from '../helpers/database.js';
import { createApp } from '../../src/bootstrap.js';
import { migrate } from '../../src/database/migrate.js';
import { seed, stableId } from '../../src/database/seed.js';

let fixture: Awaited<ReturnType<typeof databaseFixture>>;
let pool: Pool;
let base: string;
beforeEach(async () => { fixture = await databaseFixture(); pool = fixture.pool; base = fixture.base; });
afterEach(async () => { await fixture?.close(); });
async function get(path: string) { const res = await fetch(base + path); return { status: res.status, body: await res.json() }; }

test('replacement removes old catalog only, preserves accounts/sessions, and remains stable after reseeding', async () => {
  // Exercise the historical catalog-only bootstrap. Supply FKs intentionally block replacement now.
  await pool.query('DROP TABLE partner_skills');
  const user = (await pool.query("INSERT INTO users(display_name) VALUES('Catalog replacement test') RETURNING id")).rows[0].id;
  await pool.query("INSERT INTO identities(user_id,provider,subject) VALUES($1,'email','catalog@example.test')", [user]);
  await pool.query("INSERT INTO sessions(user_id,refresh_hash,family_id,expires_at) VALUES($1,'test-refresh-hash',$2,now()+interval '1 day')", [user, randomUUID()]);
  const auth = async () => Promise.all(['users', 'identities', 'sessions'].map(async table => (await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows));
  const before = await auth();
  await pool.query("INSERT INTO categories(id,code,name_vi) VALUES($1,'legacy','Old catalog')", [stableId('legacy')]);
  await pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES($1,$2)', [stableId('camera_mounting'), stableId('legacy')]);
  await seed(pool, { replaceCatalog: true });
  await seed(pool); await seed(pool);
  assert.deepEqual(await auth(), before);
  assert.equal((await pool.query("SELECT count(*) FROM categories WHERE code='legacy'")).rows[0].count, '0');
  assert.deepEqual((await pool.query('SELECT (SELECT count(*) FROM categories) c,(SELECT count(*) FROM skills) s,(SELECT count(*) FROM skill_categories) sc')).rows[0], {c:'49',s:'128',sc:'128'});
  const seen = new Set<string>();
  const groups = (await pool.query('SELECT id FROM categories WHERE parent_id IS NOT NULL')).rows;
  for (const group of groups) {
    const result = await get(`/skills?category_id=${group.id}&locale=ja`);
    assert.equal(result.status, 200); assert.ok(result.body.items.length);
    for (const skill of result.body.items) {
      assert.ok(!seen.has(skill.id)); seen.add(skill.id);
      assert.deepEqual(skill.category_ids, [group.id]); assert.equal(skill.name_locale, 'ja');
    }
  }
  assert.equal(seen.size, 128);
});
test('replacement rejects even cascading external references without touching catalog', async () => {
  await pool.query('CREATE TABLE dependent_test (skill_id uuid REFERENCES skills(id) ON DELETE CASCADE)');
  await pool.query('INSERT INTO dependent_test VALUES($1)', [stableId('socket_replacement')]);
  await assert.rejects(seed(pool, { replaceCatalog: true }), /external references/);
  assert.equal((await pool.query('SELECT count(*) FROM skills')).rows[0].count, '128');
  assert.equal((await pool.query('SELECT count(*) FROM dependent_test')).rows[0].count, '1');
});
test('replacement rolls back deletes and restores exact previous catalog if insertion fails', async () => {
  // Exercise the historical catalog-only bootstrap. Supply FKs intentionally block replacement now.
  await pool.query('DROP TABLE partner_skills');
  const snapshot = async () => Promise.all(['categories','skills','skill_categories'].map(async table => (await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows));
  await pool.query("UPDATE categories SET name_vi='Edited before replacement' WHERE code='beauty'");
  const before = await snapshot();
  await pool.query("CREATE FUNCTION reject_replacement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'replacement fixture failure'; END $$");
  await pool.query('CREATE TRIGGER reject_replacement BEFORE INSERT ON skills FOR EACH ROW EXECUTE FUNCTION reject_replacement()');
  await assert.rejects(seed(pool, { replaceCatalog: true }), /replacement fixture failure/);
  assert.deepEqual(await snapshot(), before);
});

test('empty-schema migration, PostGIS, rerun migration/seed and preserve edited data', async () => {
  assert.match((await pool.query('SELECT postgis_version() AS version')).rows[0].version, /^3\./);
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, '6');
  const count = async () => (await pool.query('SELECT (SELECT count(*) FROM categories) AS c,(SELECT count(*) FROM skills) AS s,(SELECT count(*) FROM skill_categories) AS sc')).rows[0];
  const original = await count();
  assert.deepEqual(original, { c: '49', s: '128', sc: '128' });
  await pool.query('UPDATE categories SET name_vi=$1,active=false WHERE code=$2', ['Tên đã sửa','beauty']);
  await migrate(pool); await seed(pool); await seed(pool);
  assert.deepEqual(await count(), original);
  assert.deepEqual((await pool.query("SELECT name_vi,active FROM categories WHERE code='beauty'")).rows[0], { name_vi: 'Tên đã sửa', active: false });
  await pool.query("UPDATE categories SET name_vi='Làm đẹp không y tế',active=true WHERE code='beauty'");
});
test('HTTP categories and skills read DB, support groups, shared skill and structured response', async () => {
  const roots = await get('/categories?parent_id=root');
  assert.equal(roots.status, 200); assert.equal(roots.body.items.length, 10);
  const groups = await get(`/categories?parent_id=${stableId('home_utilities')}`);
  assert.equal(groups.body.items[0].parent_id, stableId('home_utilities'));
  const skills = await get(`/skills?category_id=${stableId('home_utilities')}`);
  assert.equal(skills.body.items.length, 15);
  assert.ok(!skills.body.items.some((x: {code:string}) => x.code === 'camera_mounting'));
  // The schema still supports N–N; sharing here is an explicit test fixture, not seed data.
  await pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES($1,$2)', [stableId('camera_mounting'), stableId('home_utilities_electrical')]);
  const camera = (await get(`/skills?category_id=${stableId('home_utilities')}`)).body.items.find((x: {code:string}) => x.code === 'camera_mounting');
  assert.equal(camera.category_ids.length, 2);
  const other = await get(`/skills?category_id=${stableId('installation_it_camera_systems')}`);
  assert.ok(other.body.items.some((x: {id:string}) => x.id === camera.id));
  assert.equal((await get('/ready')).status, 200);
});
test('inactive ancestor/group/skill filtered at every endpoint; history retained', async () => {
  await pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES($1,$2)', [stableId('camera_mounting'), stableId('home_utilities_electrical')]);
  await pool.query("UPDATE categories SET active=false WHERE code='home_utilities'");
  assert.equal((await get(`/categories?parent_id=${stableId('home_utilities')}`)).body.items.length, 0);
  assert.equal((await get(`/skills?category_id=${stableId('home_utilities_electrical')}`)).body.items.length, 0);
  const all = (await get(`/skills?category_id=${stableId('installation_it_camera_systems')}`)).body.items;
  assert.ok(!all.some((x: {code:string}) => x.code === 'socket_replacement'));
  assert.deepEqual(all.find((x: {code:string}) => x.code === 'camera_mounting').category_ids, [stableId('installation_it_camera_systems')]);
  assert.equal((await pool.query("SELECT count(*) FROM skill_categories")).rows[0].count, '129');
  await pool.query("UPDATE categories SET active=true WHERE code='home_utilities'");
  await pool.query("UPDATE categories SET active=false WHERE code='cleaning_upholstery_cleaning'");
  assert.equal((await get(`/skills?category_id=${stableId('cleaning_upholstery_cleaning')}`)).body.items.length, 0);
  await pool.query("UPDATE categories SET active=true WHERE code='cleaning_upholstery_cleaning'");
  await pool.query("UPDATE skills SET active=false WHERE code='camera_mounting'");
  assert.ok(!(await get('/skills?limit=100')).body.items.some((x: {code:string}) => x.code === 'camera_mounting'));
  await pool.query("UPDATE skills SET active=true WHERE code='camera_mounting'");
});
test('pagination visits exactly once and cursor cannot cross endpoint or filter', async () => {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const result = await get('/categories?limit=3' + (cursor ? '&cursor='+encodeURIComponent(cursor) : ''));
    assert.equal(result.status, 200);
    ids.push(...result.body.items.map((x: {id:string}) => x.id)); cursor = result.body.next_cursor;
  } while (cursor);
  assert.equal(ids.length, 49); assert.equal(new Set(ids).size, 49);
  const first = await get('/categories?limit=1');
  assert.equal((await get('/skills?cursor='+encodeURIComponent(first.body.next_cursor))).status, 400);
  assert.equal((await get('/categories?parent_id=root&cursor='+encodeURIComponent(first.body.next_cursor))).status, 400);
});
test('invalid input, unknown and inactive categories return safe results', async () => {
  for (const path of ['/skills?category_id=wrong', '/categories?limit=101', '/categories?limit=1&limit=2', '/categories?cursor=oops', '/categories?unknown=true']) {
    const result = await get(path); assert.equal(result.status, 400); assert.equal(result.body.code, 'VALIDATION'); assert.equal(result.body.retryable, false); assert.ok(result.body.correlation_id); assert.ok(!('stack' in result.body));
  }
  assert.deepEqual((await get(`/skills?category_id=${randomUUID()}`)).body.items, []);
  assert.equal((await get('/nonexistent')).status, 404);
});
test('FK, duplicate mapping, blank name, invalid version and category cycle rejected', async () => {
  await assert.rejects(pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES ($1,$2)', [randomUUID(), stableId('home_utilities')]), { code: '23503' });
  await assert.rejects(pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES ($1,$2)', [stableId('socket_replacement'), stableId('home_utilities_electrical')]), { code: '23505' });
  await assert.rejects(pool.query("UPDATE categories SET parent_id=$1 WHERE code='home_utilities'", [stableId('home_utilities_electrical')]), { code: '23514' });
  await assert.rejects(pool.query("UPDATE skills SET name_vi='' WHERE code='socket_replacement'"), { code: '23514' });
  await assert.rejects(pool.query("UPDATE skills SET schema_version=0 WHERE code='socket_replacement'"), { code: '23514' });
});
test('implemented responses match canonical OpenAPI', async () => {
  const { Ajv2020 } = await import('ajv/dist/2020.js');
  const { default: formats } = await import('ajv-formats');
  const spec = JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json', import.meta.url), 'utf8'));
  const ajv = new Ajv2020({ strict: false });
  (formats as unknown as (instance: typeof ajv) => void)(ajv);
  for (const [path, name] of [['/categories','listCategoriesPage'],['/skills','listSkillsPage'],['/skills?limit=0','Error']]) {
    const validate = ajv.compile({ ...spec.components.schemas[name], components: spec.components });
    const response = await get(path); assert.ok(validate(response.body), JSON.stringify(validate.errors));
  }
});
test('DB unavailable yields 503 with no details; liveness stays alive', async () => {
  const broken = new Pool({ connectionString: 'postgresql://no:private-value@127.0.0.1:1/dvqb_test', connectionTimeoutMillis: 300 });
  const offline = await createApp({ databaseUrl: '', cursorSecret: 's'.repeat(32), port: 0, host: '127.0.0.1' }, broken);
  await offline.listen(0, '127.0.0.1');
  try {
    for (const path of ['/ready','/skills']) {
      const response = await fetch(await offline.getUrl()+'/v1'+path); assert.equal(response.status, 503);
      const text = await response.text(); assert.ok(!text.includes('private-value')); assert.ok(!text.includes('ECONNREFUSED')); assert.ok(!text.includes('stack'));
    }
    assert.equal((await fetch(await offline.getUrl()+'/v1/health')).status, 200);
  } finally { await offline.close(); await broken.end(); }
});
test('migration checksum rejects changed history without applying additional SQL', async () => {
  await pool.query("UPDATE schema_migrations SET checksum='wrong'");
  await assert.rejects(migrate(pool), /checksum changed/);
  assert.equal((await pool.query('SELECT count(*) FROM categories')).rows[0].count, '49');
});
test('seed failure rolls back every preceding insert', async () => {
  await pool.query('TRUNCATE skill_categories, skills, categories CASCADE');
  await pool.query("CREATE FUNCTION reject_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture seed failure'; END $$");
  await pool.query('CREATE TRIGGER reject_seed BEFORE INSERT ON skills FOR EACH ROW EXECUTE FUNCTION reject_seed()');
  await assert.rejects(seed(pool));
  assert.equal((await pool.query('SELECT count(*) FROM categories')).rows[0].count, '0');
});

test('localized real catalog covers every industry, paginates skills and falls back safely', async () => {
  for (const locale of ['vi', 'en', 'ja']) {
    const roots = (await get(`/categories?parent_id=root&locale=${locale}`)).body.items;
    assert.equal(roots.length, 10);
    for (const root of roots) {
      assert.equal(root.name_locale, locale);
      const groups = (await get(`/categories?parent_id=${root.id}&locale=${locale}`)).body.items;
      assert.equal(groups.length, root.code === 'cleaning' ? 2 : root.code === 'digital_repair' ? 5 : 4);
      for (const group of groups) {
        assert.equal(group.name_locale, locale);
        const skills = (await get(`/skills?category_id=${group.id}&locale=${locale}`)).body.items;
        assert.ok(skills.length >= 1);
        assert.ok(skills.every((s: {name_locale:string}) => s.name_locale === locale));
      }
    }
  }
  const english = (await get('/categories?parent_id=root&locale=en')).body.items.find((x: {code:string}) => x.code === 'beauty');
  assert.equal(english.name, 'Beauty (non-medical)');
  assert.equal(english.name_vi, 'Làm đẹp không y tế');
  assert.ok(!('translations' in english));
  for (const translations of [{}, { en: '' }, { en: '  ' }, { en: null }, { en: 7 }, { en: {} }]) {
    await pool.query('UPDATE skills SET translations=$1 WHERE code=$2', [translations, 'socket_replacement']);
    const item = (await get(`/skills?category_id=${stableId('home_utilities_electrical')}&locale=en`)).body.items.find((x: {code:string}) => x.code === 'socket_replacement');
    assert.equal(item.name_locale, 'vi'); assert.equal(item.name, item.name_vi);
  }
  const ids = new Set<string>(); let cursor: string | null = null;
  do {
    const page: {items: {id:string}[]; next_cursor:string|null} = (await get('/skills?locale=ja&limit=37' + (cursor ? '&cursor='+encodeURIComponent(cursor) : ''))).body;
    for (const item of page.items) { assert.ok(!ids.has(item.id)); ids.add(item.id); }
    cursor = page.next_cursor;
  } while (cursor);
  assert.equal(ids.size, 128);
});
test('locale validation and cursor isolation apply to both endpoints', async () => {
  for (const endpoint of ['categories', 'skills']) {
    for (const query of ['locale=fr', 'locale=', 'locale=EN', 'locale=en&locale=ja', 'locale[]=en']) assert.equal((await get(`/${endpoint}?${query}`)).status, 400);
    const first = (await get(`/${endpoint}?locale=en&limit=1`)).body;
    assert.equal((await get(`/${endpoint}?locale=ja&cursor=${encodeURIComponent(first.next_cursor)}`)).status, 400);
    assert.equal((await get(`/${endpoint}?locale=en&cursor=${encodeURIComponent(first.next_cursor)}`)).status, 200);
  }
});
test('seed fills missing translation keys without overwriting names, custom translations or disabled records', async () => {
  for (const table of ['categories', 'skills']) {
    const code = table === 'categories' ? 'beauty' : 'nail_polish';
    await pool.query(`UPDATE ${table} SET name_vi='Tên riêng',active=false,translations=$1 WHERE code=$2`, [{en:'Custom',fr:'Manuel'}, code]);
    await seed(pool); await seed(pool);
    const item = (await pool.query(`SELECT * FROM ${table} WHERE code=$1`, [code])).rows[0];
    assert.equal(item.name_vi, 'Tên riêng'); assert.equal(item.active, false);
    assert.equal(item.translations.en, 'Custom'); assert.equal(item.translations.fr, 'Manuel'); assert.ok(item.translations.ja);
    await assert.rejects(pool.query(`UPDATE ${table} SET translations='[]' WHERE code=$1`, [code]), {code:'23514'});
  }
});

test('migration upgrades existing skills without changing their IDs, names or mappings', async () => {
  // Recreate the exact pre-003 column shape in this isolated test schema.
  await pool.query('ALTER TABLE skills DROP COLUMN translations');
  await pool.query("DELETE FROM schema_migrations WHERE name='003_catalog_translations.sql'");
  await pool.query("UPDATE skills SET name_vi='Tên giữ nguyên',active=false WHERE code='socket_replacement'");
  const links = (await pool.query('SELECT * FROM skill_categories ORDER BY id')).rows;
  await migrate(pool); await seed(pool);
  const skill = (await pool.query("SELECT id,name_vi,active,translations FROM skills WHERE code='socket_replacement'")).rows[0];
  assert.equal(skill.id, stableId('socket_replacement')); assert.equal(skill.name_vi, 'Tên giữ nguyên'); assert.equal(skill.active, false);
  assert.equal(skill.translations.ja, 'コンセント・スイッチ交換');
  assert.deepEqual((await pool.query('SELECT * FROM skill_categories ORDER BY id')).rows, links);
});
