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

test('empty-schema migration, PostGIS, rerun migration/seed and preserve edited data', async () => {
  assert.match((await pool.query('SELECT postgis_version() AS version')).rows[0].version, /^3\./);
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, '1');
  const count = async () => (await pool.query('SELECT (SELECT count(*) FROM categories) AS c,(SELECT count(*) FROM skills) AS s,(SELECT count(*) FROM skill_categories) AS sc')).rows[0];
  const original = await count();
  assert.deepEqual(original, { c: '20', s: '20', sc: '21' });
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
  assert.equal(skills.body.items.length, 3);
  const camera = skills.body.items.find((x: {code:string}) => x.code === 'camera_installation');
  assert.equal(camera.category_ids.length, 2);
  const other = await get(`/skills?category_id=${stableId('installation_it_services')}`);
  assert.ok(other.body.items.some((x: {id:string}) => x.id === camera.id));
  assert.equal((await get('/ready')).status, 200);
});
test('inactive ancestor/group/skill filtered at every endpoint; history retained', async () => {
  await pool.query("UPDATE categories SET active=false WHERE code='home_utilities'");
  assert.equal((await get(`/categories?parent_id=${stableId('home_utilities')}`)).body.items.length, 0);
  assert.equal((await get(`/skills?category_id=${stableId('home_utilities_services')}`)).body.items.length, 0);
  const all = (await get('/skills?limit=100')).body.items;
  assert.ok(!all.some((x: {code:string}) => x.code === 'electrical_repair'));
  assert.deepEqual(all.find((x: {code:string}) => x.code === 'camera_installation').category_ids, [stableId('installation_it_services')]);
  assert.equal((await pool.query("SELECT count(*) FROM skill_categories")).rows[0].count, '21');
  await pool.query("UPDATE categories SET active=true WHERE code='home_utilities'");
  await pool.query("UPDATE categories SET active=false WHERE code='cleaning_services'");
  assert.equal((await get(`/skills?category_id=${stableId('cleaning')}`)).body.items.length, 0);
  await pool.query("UPDATE categories SET active=true WHERE code='cleaning_services'");
  await pool.query("UPDATE skills SET active=false WHERE code='camera_installation'");
  assert.ok(!(await get('/skills?limit=100')).body.items.some((x: {code:string}) => x.code === 'camera_installation'));
  await pool.query("UPDATE skills SET active=true WHERE code='camera_installation'");
});
test('pagination visits exactly once and cursor cannot cross endpoint or filter', async () => {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const result = await get('/categories?limit=3' + (cursor ? '&cursor='+encodeURIComponent(cursor) : ''));
    assert.equal(result.status, 200);
    ids.push(...result.body.items.map((x: {id:string}) => x.id)); cursor = result.body.next_cursor;
  } while (cursor);
  assert.equal(ids.length, 20); assert.equal(new Set(ids).size, 20);
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
  await assert.rejects(pool.query('INSERT INTO skill_categories(skill_id,category_id) VALUES ($1,$2)', [stableId('electrical_repair'), stableId('home_utilities_services')]), { code: '23505' });
  await assert.rejects(pool.query("UPDATE categories SET parent_id=$1 WHERE code='home_utilities'", [stableId('home_utilities_services')]), { code: '23514' });
  await assert.rejects(pool.query("UPDATE skills SET name_vi='' WHERE code='electrical_repair'"), { code: '23514' });
  await assert.rejects(pool.query("UPDATE skills SET schema_version=0 WHERE code='electrical_repair'"), { code: '23514' });
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
  assert.equal((await pool.query('SELECT count(*) FROM categories')).rows[0].count, '20');
});
test('seed failure rolls back every preceding insert', async () => {
  await pool.query('TRUNCATE skill_categories, skills, categories CASCADE');
  await pool.query("CREATE FUNCTION reject_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture seed failure'; END $$");
  await pool.query('CREATE TRIGGER reject_seed BEFORE INSERT ON skills FOR EACH ROW EXECUTE FUNCTION reject_seed()');
  await assert.rejects(seed(pool));
  assert.equal((await pool.query('SELECT count(*) FROM categories')).rows[0].count, '0');
});
