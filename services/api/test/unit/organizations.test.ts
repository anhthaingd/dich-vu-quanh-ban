import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../../src/config/environment.js';
import {contactInput,challengeInput,verifyInput,passwordInput} from '../../src/modules/auth/challenge.input.js';
import {inviteInput,tokenInput,grantsInput,contactEdit,organizationQuery,changeInput} from '../../src/modules/organizations/organizations.input.js';
test('local message configuration fails closed outside dedicated loopback DEMO/test databases',()=>{
 const base={DATABASE_URL:'postgresql://localhost/dvqb_p1_demo',CURSOR_SECRET:'c'.repeat(32),NODE_ENV:'development',LOCAL_MESSAGES:'1',LOCAL_MESSAGES_SECRET:'s'.repeat(32),LOCAL_MESSAGE_CONTACTS:'demo@example.test',LOCAL_SMS_DIRECTORY:'/tmp/dvqb-test'};
 assert.equal(config(base).localMessages?.contacts[0],'demo@example.test');
 for(const extra of [{NODE_ENV:'production'},{DATABASE_URL:'postgresql://localhost/dvqb_local'},{DATABASE_URL:'postgresql://remote/dvqb_p1_demo'},{LOCAL_MESSAGES_SECRET:'short'},{LOCAL_MAILPIT_URL:'https://remote.test'},{LOCAL_MAILPIT_URL:'http://localhost:8025/path'},{LOCAL_MAILPIT_URL:'http://user:pass@localhost:8025'}])assert.throws(()=>config({...base,...extra}));
 assert.equal(config({...base,LOCAL_MESSAGES:'0'}).localMessages,undefined);
});
test('team and challenge inputs reject malformed contacts, secret shapes, grants and query filters',()=>{
 const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 assert.equal(contactInput(' A+demo@Example.test ').contact,'a+demo@example.test');assert.equal(contactInput('+84900000001').provider,'phone');
 for(const contact of ['',null,'0900000000','a\n@example.test'])assert.throws(()=>contactInput(contact));
 assert.throws(()=>challengeInput({contact:'a@example.test',purpose:'login'}));assert.throws(()=>verifyInput({challenge_id:id,code:'12'}));assert.throws(()=>passwordInput({password:''}));assert.equal(passwordInput({password:'test'}),'test');
 assert.throws(()=>inviteInput({contact:'a@example.test',permissions:['members.manage']}));assert.throws(()=>tokenInput({token:'x'}));assert.equal(tokenInput({token:'b'.repeat(64)}),'b'.repeat(64));
 const g={expected_version:1,permissions:['jobs.assign'],reason:'DEMO',reauth_grant:'a'.repeat(64)};assert.equal(grantsInput(g).reason,'DEMO');
 for(const extra of [{expected_version:0},{reason:''},{permissions:['admin.users']},{permissions:['wallet.withdraw']},{permissions:['jobs.assign','jobs.assign']},{reauth_grant:'x'}])assert.throws(()=>grantsInput({...g,...extra}));
 assert.equal(contactEdit({expected_version:2,membership_id:null}).membership_id,null);assert.throws(()=>contactEdit({expected_version:2,membership_id:'bad'}));
 assert.equal(organizationQuery({active:'false',limit:'1'},'active').filter,'false');assert.throws(()=>organizationQuery({status:'bad'},'status'));assert.throws(()=>organizationQuery({limit:'0'},'status'));assert.equal(changeInput({expected_version:1},false).reason,'');assert.throws(()=>changeInput({expected_version:1,reason:''}));
});
