import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cursor, parseQuery } from '../../src/modules/catalog/catalog.query.js';
import { config } from '../../src/config/environment.js';
const id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
test('valid pagination and filters; malformed/repeated/unknown input rejected', () => {
  assert.deepEqual(parseQuery({}, 'categories'), { limit: 20, cursor: undefined, filter: undefined, locale: 'vi' });
  assert.equal(parseQuery({ parent_id: 'root', limit: '100' }, 'categories').filter, 'root');
  assert.equal(parseQuery({ category_id: id }, 'skills').filter, id);
  for (const query of [{ limit: '0' }, { limit: '101' }, { limit: '2.5' }, { limit: '' }, { limit: ['1','2'] }, { cursor: '' }, { category_id: 'invalid' }, { active: 'false' }]) assert.throws(() => parseQuery(query, 'skills'));
});
test('signed cursor is bound to endpoint/filter; rejects tampering', () => {
  const cursor = new Cursor('test-secret');
  const position = { id, created_at: '2026-09-28 00:00:00.123456+00' };
  const token = cursor.encode(position, 'skills:one:public');
  assert.deepEqual(cursor.decode(token, 'skills:one:public'), position);
  assert.throws(() => cursor.decode(token, 'categories:one:public'));
  assert.throws(() => cursor.decode(token + 'x', 'skills:one:public'));
  assert.throws(() => cursor.decode('bad', 'skills:one:public'));
});
test('configuration fails closed on absent secrets and invalid ports', () => {
  assert.throws(() => config({}));
  assert.throws(() => config({ DATABASE_URL: 'postgresql://localhost/db', CURSOR_SECRET: 's'.repeat(32), PORT: 'no' }));
});
test('admin pilot is disabled by default and restricted to isolated local databases',()=>{
 const base={DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(32),NODE_ENV:'test'};
 assert.equal(config(base).admin,undefined);assert.ok(config({...base,ADMIN_LOCAL_SECRET:'a'.repeat(32)}).admin);
 for(const change of [{NODE_ENV:'production'},{DATABASE_URL:'postgresql://remote.example/dvqb_test'},{DATABASE_URL:'postgresql://localhost/dvqb_local'},{ADMIN_LOCAL_SECRET:'short'}])assert.throws(()=>config({...base,ADMIN_LOCAL_SECRET:'a'.repeat(32),...change}));
});
