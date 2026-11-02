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
test('P2 finance and media require explicit local credentials and cannot target external services',()=>{
 const base={DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(32),NODE_ENV:'test'};
 assert.equal(config(base).finance,undefined);assert.equal(config(base).calls,undefined);
 const pilot={...base,FINANCE_LOCAL_SECRET:'f'.repeat(32),LIVEKIT_URL:'ws://127.0.0.1:7880',LIVEKIT_API_KEY:'devkey',LIVEKIT_API_SECRET:'secret'};
 assert.ok(config(pilot).finance);assert.equal(config(pilot).calls?.url,'ws://127.0.0.1:7880');
 for(const change of [{NODE_ENV:'production'},{DATABASE_URL:'postgresql://remote.example/dvqb_test'},{FINANCE_LOCAL_SECRET:'short'},{LIVEKIT_URL:'wss://cloud.example'},{LIVEKIT_URL:'ws://user:secret@localhost:7880'},{LIVEKIT_URL:'ws://localhost:7880/path'},{LIVEKIT_API_SECRET:''}])assert.throws(()=>config({...pilot,...change}));
});
test('operational dvqb_local opt-in allows local adapters without enabling remote or production targets',()=>{
 const base={DATABASE_URL:'postgresql://localhost:55432/dvqb_local',CURSOR_SECRET:'c'.repeat(32),NODE_ENV:'development',HOST:'127.0.0.1',LOCAL_OPERATIONAL_DATA:'1',ADMIN_LOCAL_SECRET:'a'.repeat(32),FINANCE_LOCAL_SECRET:'f'.repeat(32),LOCAL_MESSAGES:'1',LOCAL_MESSAGES_SECRET:'m'.repeat(32),LOCAL_MESSAGE_CONTACTS:'seed@example.test',LOCAL_SMS_DIRECTORY:'/tmp/dvqb-operational'};
 const result=config(base);assert.ok(result.admin);assert.ok(result.finance);assert.deepEqual(result.localMessages?.contacts,['seed@example.test']);
 for(const extra of [{LOCAL_OPERATIONAL_DATA:''},{NODE_ENV:'production'},{NODE_ENV:'test'},{HOST:'0.0.0.0'},{DATABASE_URL:'postgresql://remote/dvqb_local'},{DATABASE_URL:'postgresql://localhost/other'},{DATABASE_URL:'postgresql://localhost/dvqb_local?host=remote'}])assert.throws(()=>config({...base,...extra}));
});
