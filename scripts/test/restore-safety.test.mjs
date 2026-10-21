import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localTestDatabase,drillSchema,remapDump} from '../ops/local-safety.mjs';
test('restore drill rejects production remote database and non-disposable schema targets',()=>{
 assert.equal(localTestDatabase('postgresql://dvqb_test:test@127.0.0.1:55433/dvqb_test').pathname,'/dvqb_test');
 for(const u of ['postgresql://test@db.example/dvqb_test','postgresql://test@localhost/dvqb_local','postgresql://test@localhost/dvqb_test?options=unsafe','https://localhost/dvqb_test'])assert.throws(()=>localTestDatabase(u));
 for(const s of ['public','dvqb_test','drill_x_source','drill_'+ 'a'.repeat(32)+'_source;DROP SCHEMA public'])assert.throws(()=>drillSchema(s));
 const source='drill_'+ 'a'.repeat(32)+'_source',target='drill_'+ 'b'.repeat(32)+'_restored';
 assert.equal(remapDump(`CREATE SCHEMA ${source};\nCREATE TABLE ${source}.users ();`,source,target),`CREATE SCHEMA ${target};\nCREATE TABLE ${target}.users ();`);
 assert.throws(()=>remapDump('CREATE SCHEMA public;',source,target));assert.throws(()=>remapDump(`CREATE SCHEMA ${source};`,source,source));
});
