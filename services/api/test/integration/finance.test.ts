import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {databaseFixture} from '../helpers/database.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
const password='DEMO finance password 2026';
type Actor={id:string;token:string;mfa?:string};let owner:Actor,admin:Actor,other:Actor,partner:string;
async function call(a:Actor|undefined,path:string,method='GET',body?:unknown,key=randomUUID()){const r=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json',...(a?{Authorization:'Bearer '+a.token}:{}),...(a?.mfa?{'X-Admin-Session':a.mfa}:{}),'Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};}
async function actor(){const r=await call(undefined,'/auth/register','POST',{email:randomUUID()+'@example.test',password,display_name:'DEMO finance'});assert.equal(r.status,201,JSON.stringify(r));return {id:r.body.user.id,token:r.body.access_token} as Actor;}
async function enroll(a:Actor,permissions=['finance.read','finance.review']){for(const p of permissions)await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[a.id,p]);const r=await call(a,'/admin/auth/enrollment','POST',{password});assert.equal(r.status,201,JSON.stringify(r));const v=await call(a,'/admin/auth/enrollment/confirm','POST',{password,code:totp(decode32(r.body.secret),Math.floor(Date.now()/30000))});assert.equal(v.status,201,JSON.stringify(v));a.mfa=v.body.token;return a;}
async function grant(scope='bank',a=owner){const r=await call(a,'/finance/reauthenticate','POST',{password,scope});assert.equal(r.status,200,JSON.stringify(r));return r.body.grant;}
async function bankRequest(number='1234567890'){const b=(await call(owner,`/partners/${partner}/bank`)).body;const r=await call(owner,`/partners/${partner}/bank`,'PUT',{expected_version:b.version,bank_code:'DEMO-VCB',account_number:number,holder_name:'DEMO OWNER',reason:'DEMO bank',reauth_grant:await grant()});assert.equal(r.status,200,JSON.stringify(r));return r.body;}
async function decision(d:string,id:string,version:number,decision:string,extra:Record<string,unknown>={},a=admin,key=randomUUID()){return call(a,`/admin/${d}/${id}/decision`,'POST',{expected_version:version,decision,reason:'DEMO checked',checked:true,...extra},key);}
async function verifiedBank(){const b=await bankRequest();const r=await decision('bank-accounts',b.pending.id,b.pending.version,'approve');assert.equal(r.status,200,JSON.stringify(r));return (await call(owner,`/partners/${partner}/bank`)).body.current;}
async function topup(amount='100000',reference=randomUUID()){const r=await call(owner,'/topups','POST',{partner_id:partner,amount});assert.equal(r.status,201,JSON.stringify(r));const d=await call(admin,'/admin/finance-simulator/deposits','POST',{partner_id:partner,amount,reference});assert.equal(d.status,201,JSON.stringify(d));const posted=await decision('topups',r.body.id,r.body.version,'approve',{bank_reference:reference});assert.equal(posted.status,200,JSON.stringify(posted));return posted.body;}
async function payout(bank:string,amount='50000',key=randomUUID()){return call(owner,'/payouts','POST',{partner_id:partner,amount,bank_account_id:bank,reauth_grant:await grant('payout')},key);}
beforeEach(async()=>{f=await databaseFixture('finance-test-auth-secret-'.repeat(3),true,undefined,false,{secret:'finance-test-admin-secret-'.repeat(3)},{finance:{secret:'finance-test-bank-secret-'.repeat(3)}});owner=await actor();other=await actor();admin=await enroll(await actor());partner=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO finance partner') RETURNING id")).rows[0].id;await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true)',[partner,owner.id]);await f.pool.query("INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",[partner]);});
afterEach(async()=>{await f?.close();});
test('bank proposal keeps current, encrypts number, one-use reauth, cancellation/version/retry and payout blocker',async()=>{
 const bank=await verifiedBank();const b=await bankRequest('9876543210');assert.equal(b.current.id,bank.id);assert.equal(b.pending.account_last4,'3210');assert.ok(!JSON.stringify(b).includes('9876543210'));assert.equal((await call(owner,'/bank-accounts/'+b.pending.id)).body.state,'pending');assert.equal((await call(other,'/bank-accounts/'+b.pending.id)).status,404);
 const db=(await f.pool.query('SELECT account_cipher FROM bank_change_requests WHERE id=$1',[b.pending.id])).rows[0];assert.ok(!db.account_cipher.includes('9876543210'));
 const input={expected_version:b.version,reason:'DEMO cancel'},key=randomUUID();const cancelled=await call(owner,`/partners/${partner}/bank/cancel`,'POST',input,key);assert.equal(cancelled.status,200);assert.equal(cancelled.body.current.id,bank.id);assert.equal(cancelled.body.pending,null);assert.deepEqual(await call(owner,`/partners/${partner}/bank/cancel`,'POST',input,key),cancelled);
 await topup();const p=await payout(bank.id);assert.equal(p.status,201,JSON.stringify(p));const g=await grant();const failed=await call(owner,`/partners/${partner}/bank`,'PUT',{expected_version:cancelled.body.version,bank_code:'DEMO',account_number:'1111111111',holder_name:'DEMO OWNER',reason:'DEMO blocked',reauth_grant:g});assert.equal(failed.status,409);assert.equal((await call(other,`/partners/${partner}/bank`)).status,404);
 const snapshots=JSON.stringify((await f.pool.query('SELECT response_snapshot FROM idempotency_keys')).rows);assert.ok(!snapshots.includes('9876543210'));assert.ok(!snapshots.includes(g));
});
test('topup pending/image never credits; bank amount/partner/ref required and source ref globally unique',async()=>{
 const r=await call(owner,'/topups','POST',{partner_id:partner,amount:'100000'});assert.equal(r.status,201);assert.equal((await call(owner,`/partners/${partner}/wallet`)).body.balance,'0');
 assert.equal((await decision('topups',r.body.id,1,'approve',{bank_reference:'no-such-reference'})).status,409);
 assert.equal((await call(admin,'/admin/finance-simulator/deposits','POST',{partner_id:partner,amount:'99999',reference:'wrong-amount'})).status,201);
 assert.equal((await decision('topups',r.body.id,1,'approve',{bank_reference:'wrong-amount'})).status,409);
 const ref='TEST-REFERENCE';await call(admin,'/admin/finance-simulator/deposits','POST',{partner_id:partner,amount:'100000',reference:ref});
 const a2=await enroll(await actor());const r2=await call(owner,'/topups','POST',{partner_id:partner,amount:'100000'});
 const [x,y]=await Promise.all([decision('topups',r.body.id,1,'approve',{bank_reference:ref}),decision('topups',r2.body.id,1,'approve',{bank_reference:ref},a2)]);assert.deepEqual([x.status,y.status].sort(),[200,409]);
 assert.equal((await call(owner,`/partners/${partner}/wallet`)).body.balance,'100000');assert.equal((await f.pool.query("SELECT count(*) FROM ledger_transactions WHERE kind='topup'")).rows[0].count,'1');
 const ledger=(await call(owner,`/partners/${partner}/ledger`)).body;assert.equal(ledger.items.length,1);assert.equal(ledger.items[0].amount,'100000');assert.ok([r.body.id,r2.body.id].includes(ledger.items[0].reference_id));
 assert.equal((await call(other,'/topups/'+r.body.id)).status,404);assert.equal((await call(owner,'/admin/topups')).status,403);
});
test('timeout after bank transfer retains hold; original transfer is reconciled once across retries and bank changes remain blocked',async()=>{
 const bank=await verifiedBank();await topup('200000');let p=(await payout(bank.id,'100000')).body;assert.equal(p.state,'pending');
 p=(await decision('payouts',p.id,p.version,'approve')).body;assert.equal(p.state,'approved');assert.equal((await call(owner,`/partners/${partner}/wallet`)).body.balance,'200000');
 p=(await decision('payouts',p.id,p.version,'transferring',{simulator_scenario:'timeout_after_success'})).body;assert.equal(p.state,'unknown');
 let wallet=(await call(owner,`/partners/${partner}/wallet`)).body;assert.equal(wallet.withdrawal_holds,'100000');assert.equal(wallet.withdrawable,'100000');
 assert.equal((await decision('payouts',p.id,p.version,'transferring')).status,409);assert.equal((await decision('payouts',p.id,p.version,'failed_verified')).status,409);
 assert.equal((await f.pool.query('SELECT count(*) FROM local_bank_transfers')).rows[0].count,'1');
 const key=randomUUID(),input={bank_reference:p.bank_reference};const result=await decision('payouts',p.id,p.version,'succeeded',input,admin,key);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.state,'succeeded');assert.deepEqual(await decision('payouts',p.id,p.version,'succeeded',input,admin,key),result);
 wallet=(await call(owner,`/partners/${partner}/wallet`)).body;assert.equal(wallet.balance,'100000');assert.equal(wallet.withdrawal_holds,'0');assert.equal((await f.pool.query("SELECT count(*) FROM ledger_transactions WHERE kind='payout'")).rows[0].count,'1');
 assert.equal((await f.pool.query('SELECT unit,sum(delta) FROM ledger_entries GROUP BY unit HAVING sum(delta)<>0')).rowCount,0);
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND permission='finance.review'",[admin.id]);assert.equal((await decision('payouts',p.id,p.version,'succeeded',input,admin,key)).status,403);
});
test('verified bank failure and pre-send rejection release funds; credit and amount minimum cannot be withdrawn',async()=>{
 const bank=await verifiedBank();assert.equal((await payout(bank.id,'50000')).status,422);assert.equal((await call(owner,'/payouts','POST',{partner_id:partner,amount:'49999',bank_account_id:bank.id,reauth_grant:'0'.repeat(64)})).status,400);
 await topup();let p=(await payout(bank.id)).body;p=(await decision('payouts',p.id,p.version,'approve')).body;p=(await decision('payouts',p.id,p.version,'transferring',{simulator_scenario:'timeout_after_failure'})).body;assert.equal(p.state,'unknown');assert.equal((await decision('payouts',p.id,p.version,'succeeded')).status,409);p=(await decision('payouts',p.id,p.version,'failed_verified')).body;assert.equal(p.state,'failed');
 let w=(await call(owner,`/partners/${partner}/wallet`)).body;assert.equal(w.balance,'100000');assert.equal(w.withdrawal_holds,'0');const p2=(await payout(bank.id)).body;assert.equal((await decision('payouts',p2.id,p2.version,'reject')).body.state,'rejected');w=(await call(owner,`/partners/${partner}/wallet`)).body;assert.equal(w.withdrawal_holds,'0');assert.equal(w.balance,'100000');
});
test('payout and invoice fee reservation serialize on the same account without overdrawing withdrawable funds',async()=>{
 const bank=await verifiedBank();await topup();const membership=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1 AND user_id=$2',[partner,owner.id])).rows[0].id;
 const job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer','{}',ST_GeogFromText('SRID=4326;POINT(105 21)'),'now') RETURNING id",[other.id,partner])).rows[0].id;await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[job,partner,membership,owner.id]);
 const asset=(await f.pool.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status) VALUES($1,$2,'result','image/png',1,'ready') RETURNING id",[owner.id,randomUUID()])).rows[0].id;
 let i=(await call(owner,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:1,labor:'1600000',materials:'0',result_asset_ids:[asset]})).body;i=(await call(owner,'/invoices/'+i.id+'/send','POST',{expected_version:i.version,draft_version_id:i.version_id})).body;
 const input={partner_id:partner,amount:'50000',bank_account_id:bank.id,reauth_grant:await grant('payout')};const [p,c]=await Promise.all([call(owner,'/payouts','POST',input),call(other,'/invoices/'+i.id+'/confirm','POST',{expected_version:i.version,version_id:i.version_id,points_used:'0'})]);assert.deepEqual([p.status,c.status].sort(),[201,422]);
 const w=(await call(owner,`/partners/${partner}/wallet`)).body;assert.ok(BigInt(w.withdrawable)>=0n);assert.ok(BigInt(w.fee_holds)+BigInt(w.withdrawal_holds)<=200000n);
});
test('failed ledger projection rolls back request state, postings, history and idempotency before an exact retry',async()=>{
 const t=(await call(owner,'/topups','POST',{partner_id:partner,amount:'100000'})).body;await call(admin,'/admin/finance-simulator/deposits','POST',{partner_id:partner,amount:'100000',reference:'ROLLBACK'});
 await f.pool.query("CREATE FUNCTION finance_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$");await f.pool.query('CREATE TRIGGER fail_finance BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION finance_fail()');
 const key=randomUUID();assert.equal((await decision('topups',t.id,1,'approve',{bank_reference:'ROLLBACK'},admin,key)).status,500);assert.equal((await call(owner,'/topups/'+t.id)).body.state,'pending');assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');assert.equal((await f.pool.query("SELECT count(*) FROM finance_history WHERE action='approve'")).rows[0].count,'0');
 await f.pool.query('DROP TRIGGER fail_finance ON ledger_entries');assert.equal((await decision('topups',t.id,1,'approve',{bank_reference:'ROLLBACK'},admin,key)).status,200);
});
test('membership revocation rechecks even old retry; admin fresh MFA/cursor scope and private receipts remain isolated',async()=>{
 const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,false) RETURNING id',[partner,other.id])).rows[0].id;for(const p of ['wallet.read','wallet.topup'])await f.pool.query('INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,$2,$3)',[m,p,owner.id]);
 const key=randomUUID(),body={partner_id:partner,amount:'100000'};const r=await call(other,'/topups','POST',body,key);assert.equal(r.status,201);await f.pool.query("UPDATE membership_grants SET revoked_at=now() WHERE membership_id=$1 AND permission='wallet.topup'",[m]);assert.equal((await call(other,'/topups','POST',body,key)).status,404);
 const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#ddd'}}).png().toBuffer();const g=(await call(owner,'/assets/upload-grants','POST',{purpose:'evidence',mime:'image/png',bytes:bytes.length})).body;assert.equal((await fetch(g.upload_url,{method:'PUT',headers:g.required_headers,body:bytes})).status,200);await call(owner,'/assets/'+g.asset_id+'/complete','POST',{expected_version:1});const top=(await call(owner,'/topups','POST',{...body,evidence_id:g.asset_id})).body;
 assert.equal((await call(other,'/assets/'+g.asset_id)).status,404);assert.equal((await fetch(f.base+'/assets/'+g.asset_id+'/admin-content',{headers:{Authorization:'Bearer '+admin.token,'X-Admin-Session':admin.mfa!}})).status,200);
 const support=await enroll(await actor(),['support.read']);assert.equal((await fetch(f.base+'/assets/'+g.asset_id+'/admin-content',{headers:{Authorization:'Bearer '+support.token,'X-Admin-Session':support.mfa!}})).status,403);
 const report=await call(owner,'/reports','POST',{kind:'service',subject:'DEMO shared evidence',body:'DEMO support review',evidence_ids:[g.asset_id]});assert.equal(report.status,201);assert.equal((await fetch(f.base+'/assets/'+g.asset_id+'/admin-content',{headers:{Authorization:'Bearer '+support.token,'X-Admin-Session':support.mfa!}})).status,200);
 const page=(await call(admin,'/admin/topups?limit=1')).body;assert.ok(page.next_cursor);assert.equal((await call(admin,'/admin/topups?state=pending&cursor='+encodeURIComponent(page.next_cursor))).status,400);
 await f.pool.query("UPDATE admin_sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",[admin.id]);assert.equal((await decision('topups',top.id,1,'reject')).status,403);assert.equal((await fetch(f.base+'/assets/'+g.asset_id+'/admin-content',{headers:{Authorization:'Bearer '+admin.token,'X-Admin-Session':admin.mfa!}})).status,403);
 await assert.rejects(f.pool.query('DELETE FROM finance_history'));
});
test('pending bank approval is blocked by a newly created payout; cancellation frees hold and reauth is scope-bound',async()=>{
 const original=await verifiedBank();await topup();const proposal=await bankRequest('1111222233');const pay=(await payout(original.id)).body;
 assert.equal((await decision('bank-accounts',proposal.pending.id,proposal.pending.version,'approve')).status,409);
 const cancelKey=randomUUID(),cancelBody={expected_version:pay.version,reason:'DEMO cancellation'};const cancelled=await call(owner,'/payouts/'+pay.id+'/cancel','POST',cancelBody,cancelKey);assert.equal(cancelled.status,200);assert.equal(cancelled.body.state,'cancelled');assert.deepEqual(await call(owner,'/payouts/'+pay.id+'/cancel','POST',cancelBody,cancelKey),cancelled);
 assert.equal((await decision('bank-accounts',proposal.pending.id,proposal.pending.version,'approve')).status,200);const b=(await call(owner,`/partners/${partner}/bank`)).body;assert.notEqual(b.current.id,original.id);assert.equal((await call(owner,'/payouts/'+pay.id)).body.bank_last4,'7890');
 const g=await grant('bank'),input={partner_id:partner,amount:'50000',bank_account_id:b.current.id,reauth_grant:g};assert.equal((await call(owner,'/payouts','POST',input)).status,403);
 const change={expected_version:b.version,bank_code:'DEMO',account_number:'4444555566',holder_name:'DEMO OWNER',reason:'DEMO scope and single use',reauth_grant:g};const created=await call(owner,`/partners/${partner}/bank`,'PUT',change);assert.equal(created.status,200);const undone=await call(owner,`/partners/${partner}/bank/cancel`,'POST',{expected_version:created.body.version,reason:'DEMO cancel'});assert.equal(undone.status,200);assert.equal((await call(owner,`/partners/${partner}/bank`,'PUT',{...change,expected_version:undone.body.version})).status,403);
 const top=(await call(owner,'/topups','POST',{partner_id:partner,amount:'999999999999999999999999999999'})).body;assert.equal(top.amount,'999999999999999999999999999999');assert.equal((await call(owner,'/topups/'+top.id+'/cancel','POST',{expected_version:1,reason:'DEMO cancel large integer'})).body.state,'cancelled');
});

test('unverified reject/approve references cannot squat legitimate deposits or future payout transfers and forward repair releases old claims',async()=>{
 const bank=await verifiedBank();const ref='VERIFIED-DEPOSIT';
 const a=(await call(owner,'/topups','POST',{partner_id:partner,amount:'200000'})).body;
 const b=(await call(owner,'/topups','POST',{partner_id:partner,amount:'200000'})).body;
 await call(admin,'/admin/finance-simulator/deposits','POST',{partner_id:partner,amount:'200000',reference:ref});
 const rejected=await decision('topups',a.id,1,'reject',{bank_reference:ref});assert.equal(rejected.status,200);assert.equal(rejected.body.bank_reference,null);
 // Recreate data written by the earlier local implementation, then apply the forward repair.
 await f.pool.query('UPDATE finance_topups SET bank_reference=$2 WHERE id=$1',[a.id,ref]);
 const repair=await readFile(new URL('../../migrations/023_p2_finance_reference_repair.sql',import.meta.url),'utf8');await f.pool.query(repair);
 const credited=await decision('topups',b.id,1,'approve',{bank_reference:ref});assert.equal(credited.status,200);assert.equal(credited.body.bank_reference,ref);
 let first=(await payout(bank.id)).body;let second=(await payout(bank.id)).body;const future='LOCAL-PAYOUT-'+second.id;
 first=(await decision('payouts',first.id,first.version,'approve',{bank_reference:future})).body;assert.equal(first.state,'approved');assert.equal(first.bank_reference,null);
 first=(await decision('payouts',first.id,first.version,'reject',{bank_reference:future})).body;assert.equal(first.bank_reference,null);
 await f.pool.query('UPDATE finance_payouts SET bank_reference=$2 WHERE id=$1',[first.id,future]);await f.pool.query(repair);
 second=(await decision('payouts',second.id,second.version,'approve',{bank_reference:'UNVERIFIED'})).body;assert.equal(second.bank_reference,null);
 const sent=await decision('payouts',second.id,second.version,'transferring');assert.equal(sent.status,200,JSON.stringify(sent));assert.equal(sent.body.bank_reference,future);
 await f.pool.query(repair);assert.equal((await call(owner,'/topups/'+b.id)).body.bank_reference,ref);assert.equal((await call(owner,'/payouts/'+second.id)).body.bank_reference,future);
 assert.equal((await f.pool.query('SELECT count(*) FROM local_bank_transfers')).rows[0].count,'1');
});
