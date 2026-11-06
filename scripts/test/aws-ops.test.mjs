import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeSecrets,validateRuntime} from '../aws/database.mjs';
test('cloud bootstrap generates independent secrets and rejects database/SQL injection drift',()=>{
 const a=runtimeSecrets('rds.example.com'),b=runtimeSecrets('rds.example.com');
 assert.notEqual(a.AUTH_SECRET,b.AUTH_SECRET);assert.equal(new Set([a.AUTH_SECRET,a.CURSOR_SECRET,a.MESSAGE_SECRET,a.ADMIN_SECRET]).size,4);
 assert.ok(validateRuntime(a,'rds.example.com').length>=32);
 assert.throws(()=>validateRuntime(a,'other.example.com'));assert.throws(()=>validateRuntime({...a,AUTH_SECRET:''},'rds.example.com'));
 assert.throws(()=>runtimeSecrets('db;evil'));assert.throws(()=>runtimeSecrets('rds.example.com',"injection'"));
 assert.throws(()=>validateRuntime({...a,DATABASE_URL:'postgresql://root:password@rds.example.com/other'},'rds.example.com'));
});

test('lab finance bootstrap preserves its encryption key across retries and grants only explicit test reviewers',async()=>{
 const ops=await import('../aws/database.mjs');const runtime=runtimeSecrets('rds.example.com');
 assert.equal(typeof ops.withLabFinanceSecret,'function');
 const first=ops.withLabFinanceSecret(runtime,true);assert.equal(runtime.FINANCE_TEST_SECRET,undefined);assert.ok(first.FINANCE_TEST_SECRET.length>=32);
 assert.notEqual(first.FINANCE_TEST_SECRET,first.ADMIN_SECRET);assert.strictEqual(ops.withLabFinanceSecret(first,true),first);assert.strictEqual(ops.withLabFinanceSecret(first,false),first);
 assert.throws(()=>ops.withLabFinanceSecret({...first,FINANCE_TEST_SECRET:'bad'},true));assert.throws(()=>ops.withLabFinanceSecret({...first,FINANCE_TEST_SECRET:first.ADMIN_SECRET},true));
 assert.ok(!ops.bootstrapPermissions(false).includes('finance.review'));assert.ok(ops.bootstrapPermissions(true).includes('finance.review'));assert.ok(ops.bootstrapPermissions(true).includes('finance.read'));
});
