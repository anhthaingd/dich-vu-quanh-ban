import {test} from 'node:test';
import assert from 'node:assert/strict';
import {credentials} from '../../src/modules/auth/auth.input.js';
import {password} from '../../src/modules/account-security/security.input.js';
// B00-32: owner decision 12/11/2026 lowered the minimum from 15 to 8 characters (characters, not bytes).
test('new passwords need 8 to 128 characters; login does not re-validate old passwords',()=>{
 const body=(p:string)=>({email:'Policy@Example.test',password:p,display_name:'DEMO'});
 assert.equal(credentials(body('abcd1234'),true).password,'abcd1234');
 assert.throws(()=>credentials(body('abcd123'),true));
 assert.throws(()=>credentials(body('x'.repeat(129)),true));
 assert.equal(credentials(body('mật-khẩu'),true).password,'mật-khẩu');
 assert.equal(credentials({email:'a@example.test',password:'x'}).password,'x');
 assert.equal(password('abcd1234'),'abcd1234');
 assert.throws(()=>password('abcd123'));
 assert.throws(()=>password('😀'.repeat(7)));
});
