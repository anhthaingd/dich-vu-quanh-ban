import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireLocalDemoDatabase } from '../../src/database/demo-options.js';
test('DEMO cannot target remote, production, other database, or connection overrides',()=>{
 const local='postgresql://demo@127.0.0.1:55432/dvqb_local';
 assert.equal(requireLocalDemoDatabase(local,'development'),local);
 for(const [url,env] of [[local,'production'],[undefined,'development'],['postgresql://demo@remote/dvqb_local','development'],['postgresql://demo@localhost/production','development'],[local+'?host=remote','development']])assert.throws(()=>requireLocalDemoDatabase(url,env));
});
