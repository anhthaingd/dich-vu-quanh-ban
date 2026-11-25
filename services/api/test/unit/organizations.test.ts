import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../../src/config/environment.js';
import {contactInput,challengeInput,verifyInput,passwordInput} from '../../src/modules/auth/challenge.input.js';
import {inviteInput,tokenInput,grantsInput,contactEdit,organizationQuery,changeInput} from '../../src/modules/organizations/organizations.input.js';
import {bankInput,moneyInput,cancelInput,reauthInput,depositInput,decisionInput,domain,requestKey,pathId} from '../../src/modules/finance/finance.input.js';
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
const failure=(work:()=>unknown)=>{try{work();}catch(e){return (e as {getResponse():unknown}).getResponse();}assert.fail('expected a 400');};
test('team inputs name the exact reason and field of each rejected value',()=>{
 const g={expected_version:1,permissions:['jobs.assign'],reason:'DEMO',reauth_grant:'a'.repeat(64)};
 assert.deepEqual(failure(()=>inviteInput({contact:'a@example.test',permissions:['members.manage']})),{reason:'TEAM_INVITE_PERMISSIONS_NOT_ALLOWED',field:'permissions'});
 assert.deepEqual(failure(()=>tokenInput({token:'x'})),{reason:'TEAM_INVITATION_TOKEN_INVALID',field:'token'});
 for(const [extra,reason,field] of [[{expected_version:0},'EXPECTED_VERSION_REQUIRED','expected_version'],[{reason:' '},'TEAM_REASON_INVALID','reason'],[{reason:'x'.repeat(1001)},'TEAM_REASON_INVALID','reason'],[{permissions:['admin.users']},'TEAM_PERMISSION_UNKNOWN','permissions'],[{permissions:'jobs.assign'},'TEAM_PERMISSION_UNKNOWN','permissions'],[{permissions:['jobs.assign','jobs.assign']},'TEAM_PERMISSION_DUPLICATE','permissions'],[{reauth_grant:'x'},'TEAM_REAUTH_GRANT_INVALID','reauth_grant'],[{permissions:['wallet.withdraw']},'TEAM_WALLET_READ_REQUIRED','permissions']] as const)
  assert.deepEqual(failure(()=>grantsInput({...g,...extra})),{reason,field},reason);
 assert.deepEqual(failure(()=>contactEdit({expected_version:2,membership_id:'bad'})),{reason:'ID_INVALID',field:'membership_id'});
 assert.deepEqual(failure(()=>organizationQuery({status:'bad'},'status')),{reason:'TEAM_FILTER_INVALID',field:'status'});
 assert.deepEqual(failure(()=>organizationQuery({active:'yes'},'active')),{reason:'TEAM_FILTER_INVALID',field:'active'});
 assert.deepEqual(failure(()=>changeInput({expected_version:1})),{reason:'TEAM_REASON_INVALID',field:'reason'});
});
test('finance inputs name the exact reason and field; money limits are unchanged',()=>{
 const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',grant='a'.repeat(64);
 const bank={expected_version:1,bank_code:'DEMO',account_number:'1234567890',holder_name:'DEMO OWNER',reason:'DEMO',reauth_grant:grant};
 assert.equal(bankInput(bank).account_number,'1234567890');
 for(const [extra,reason,field] of [[{account_number:'12345'},'FINANCE_ACCOUNT_NUMBER_INVALID','account_number'],[{account_number:'12345abc'},'FINANCE_ACCOUNT_NUMBER_INVALID','account_number'],[{bank_code:'D'},'FINANCE_BANK_CODE_INVALID','bank_code'],[{holder_name:'D'},'FINANCE_HOLDER_NAME_INVALID','holder_name'],[{reason:''},'FINANCE_REASON_INVALID','reason'],[{reauth_grant:'short'},'FINANCE_REAUTH_GRANT_INVALID','reauth_grant'],[{expected_version:'1'},'EXPECTED_VERSION_REQUIRED','expected_version']] as const)
  assert.deepEqual(failure(()=>bankInput({...bank,...extra})),{reason,field},reason);
 assert.equal(moneyInput({partner_id:id,amount:'1'}).amount,'1');assert.equal(moneyInput({partner_id:id,amount:'50000',bank_account_id:id,reauth_grant:grant},true).amount,'50000');
 assert.deepEqual(failure(()=>moneyInput({partner_id:id,amount:'49999',bank_account_id:id,reauth_grant:grant},true)),{reason:'FINANCE_AMOUNT_BELOW_MINIMUM',field:'amount'});
 for(const amount of ['0','-1','1.5','01',50000])assert.deepEqual(failure(()=>moneyInput({partner_id:id,amount})),{reason:'FINANCE_AMOUNT_INVALID',field:'amount'});
 assert.deepEqual(failure(()=>moneyInput({partner_id:'x',amount:'1'})),{reason:'ID_INVALID',field:'partner_id'});
 assert.deepEqual(failure(()=>moneyInput({partner_id:id,amount:'1',evidence_id:'x'})),{reason:'ID_INVALID',field:'evidence_id'});
 assert.deepEqual(failure(()=>cancelInput({expected_version:1,reason:' '})),{reason:'FINANCE_REASON_INVALID',field:'reason'});
 assert.deepEqual(failure(()=>reauthInput({password:'x',scope:'admin'})),{reason:'FINANCE_REAUTH_SCOPE_INVALID',field:'scope'});
 assert.deepEqual(failure(()=>reauthInput({password:'',scope:'bank'})),{reason:'FINANCE_PASSWORD_REQUIRED',field:'password'});
 assert.deepEqual(failure(()=>depositInput({partner_id:id,amount:'1',reference:''})),{reason:'FINANCE_DEPOSIT_REFERENCE_INVALID',field:'reference'});
 const d={expected_version:1,decision:'approve',reason:'DEMO'};assert.equal(decisionInput(d).simulator_scenario,'success');
 for(const [extra,reason,field] of [[{decision:'delete'},'FINANCE_DECISION_INVALID','decision'],[{simulator_scenario:'later'},'FINANCE_SIMULATOR_SCENARIO_INVALID','simulator_scenario'],[{evidence_ids:Array(11).fill(id)},'FINANCE_EVIDENCE_LIST_INVALID','evidence_ids'],[{evidence_ids:['x']},'ID_INVALID','evidence_ids'],[{bank_reference:''},'FINANCE_BANK_REFERENCE_INVALID','bank_reference']] as const)
  assert.deepEqual(failure(()=>decisionInput({...d,...extra})),{reason,field},reason);
 assert.deepEqual(failure(()=>domain('wallet')),{reason:'FINANCE_HISTORY_DOMAIN_INVALID',field:'domain'});
 assert.deepEqual(failure(()=>requestKey(undefined)),{reason:'IDEMPOTENCY_KEY_REQUIRED'});assert.deepEqual(failure(()=>pathId('1')),{reason:'ID_INVALID',field:'id'});
});
