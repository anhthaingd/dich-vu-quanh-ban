import {readFile} from 'node:fs/promises';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
import {AdminAuthService} from '../../src/modules/admin-auth/admin-auth.service.js';
const ajv=new Ajv({strict:false});addFormats.default(ajv);ajv.addSchema(JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8')),'spec');
function contract(name:string,value:unknown){const validate=ajv.getSchema('spec#/components/schemas/'+name)!;assert.ok(validate(value),JSON.stringify(validate.errors));}
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={token:string;id:string;mfa?:string};let customer:Actor,worker:Actor,admin:Actor,other:Actor,partner:string,job:string;
const password='Completion DEMO password 2026';
async function call(a:Actor,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json','Idempotency-Key':key,...(a.mfa?{'X-Admin-Session':a.mfa}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
}
async function actor(name:string){const r=await fetch(f.base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'@example.test',display_name:'DEMO '+name,password})});const a=await r.json();return {id:a.user.id,token:a.access_token};}
async function enroll(a:Actor){for(const p of ['support.read','finance.review','audit.read'])await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[a.id,p]);const setup=await call(a,'/admin/auth/enrollment','POST',{password});assert.equal(setup.status,201);const result=await call(a,'/admin/auth/enrollment/confirm','POST',{password,code:totp(decode32(setup.body.secret),Math.floor(Date.now()/30000))});assert.equal(result.status,201);a.mfa=result.body.token;}
beforeEach(async()=>{
 f=await databaseFixture('completion-test-secret-'.repeat(3),true,undefined,false,{secret:'completion-private-secret-'.repeat(3)});customer=await actor('customer');worker=await actor('worker');other=await actor('other');admin=await actor('admin');await enroll(admin);
 partner=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO completion') RETURNING id")).rows[0].id;
 const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true) RETURNING id',[partner,worker.id])).rows[0].id;
 await f.pool.query("INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",[partner]);
 job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now') RETURNING id",[customer.id,partner,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105}})])).rows[0].id;
 await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[job,partner,m,worker.id]);
});
afterEach(async()=>{await f?.close();});
async function asset(purpose:string,a=customer){return (await f.pool.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status) VALUES($1,$2,$3,'image/png',1,'ready') RETURNING id",[a.id,randomUUID(),purpose])).rows[0].id as string;}
async function ready(labor='100000',materials='50000',points='0',evidence=true){
 const photo=await asset('result',worker);let r=await call(worker,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:1,labor,materials,result_asset_ids:[photo]});assert.equal(r.status,200);let i=r.body;
 r=await call(worker,`/invoices/${i.id}/send`,'POST',{expected_version:i.version,draft_version_id:i.version_id});assert.equal(r.status,201);i=r.body;
 r=await call(customer,`/invoices/${i.id}/confirm`,'POST',{expected_version:i.version,version_id:i.version_id,points_used:points});assert.equal(r.status,201,JSON.stringify(r));i=r.body;
 const evidence_ids=evidence?[await asset('evidence')]:[];r=await call(customer,'/reports','POST',{kind:'invoice',subject:'DEMO completion',body:'DEMO evidence checked',job_id:job,invoice_id:i.id,invoice_version_id:i.version_id,evidence_ids});assert.equal(r.status,201,JSON.stringify(r));return {i,report:r.body,evidence_ids};
}
async function preview(id:string){const r=await call(admin,`/admin/reports/${id}/completion-preview`);assert.equal(r.status,200,JSON.stringify(r));contract('CompletionPreview',r.body);return r.body;}
function input(r:Awaited<ReturnType<typeof ready>>,p:Record<string,unknown>){return {expected_version:r.report.version,invoice_id:r.i.id,invoice_version_id:r.i.version_id,invoice_expected_version:r.i.version,reason:'DEMO work and direct payment checked',evidence_ids:r.evidence_ids,preview_token:p.preview_token,checked:true};}
test('admin completion previews and settles once with balanced postings, unchanged payment marks, report state and unrelated holds',async()=>{
 await f.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit,balance) VALUES($1,'POINT',50000)",[customer.id]);const r=await ready('100000','50000','50000');
 const account=(await f.pool.query('SELECT id FROM ledger_accounts WHERE owner_partner_id=$1',[partner])).rows[0].id,unrelated=randomUUID();await f.pool.query("INSERT INTO holds(account_id,kind,reference_id,amount) VALUES($1,'invoice_fee',$2,500)",[account,unrelated]);
 const p=await preview(r.report.id);assert.equal(p.total,'150000');assert.equal(p.cash_due,'100000');assert.equal(p.fee,'10000');assert.equal(p.reward,'1333');assert.equal(p.partner_delta,'40000');assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');
 const body=input(r,p),key=randomUUID(),path=`/admin/reports/${r.report.id}/complete-on-behalf`;
 const [first,retry]=await Promise.all([call(admin,path,'POST',body,key),call(admin,path,'POST',body,key)]);assert.equal(first.status,201,JSON.stringify(first));assert.deepEqual(first,retry);contract('Settlement',first.body);
 const i=first.body.invoice;assert.equal(first.body.actor_kind,'admin');assert.equal(i.settled,true);assert.equal(i.customer_payment_reported_at,null);assert.equal(i.worker_receipt_confirmed_at,null);assert.equal(i.review_eligible,false);
 assert.equal((await call(customer,`/jobs/${job}`)).body.state,'completed');assert.equal((await call(customer,`/reports/${r.report.id}`)).body.state,'open');
 assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'1');assert.equal((await f.pool.query('SELECT sum(delta) FROM ledger_entries GROUP BY unit HAVING sum(delta)<>0')).rowCount,0);
 assert.equal((await f.pool.query('SELECT state FROM holds WHERE reference_id=$1',[unrelated])).rows[0].state,'active');assert.equal((await f.pool.query('SELECT count(*) FROM admin_completion_evidence')).rows[0].count,'1');
 const audit=(await f.pool.query("SELECT details FROM audit_events WHERE action='admin.completion.settled'")).rows[0].details;assert.equal(audit.invoice_version_id,r.i.version_id);assert.deepEqual(audit.evidence_ids,r.evidence_ids);
 assert.equal((await f.pool.query("SELECT count(*) FROM notification_deliveries WHERE kind='invoice.settled.v1'")).rows[0].count,'2');
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND permission='finance.review'",[admin.id]);assert.equal((await call(admin,path,'POST',body,key)).status,403);
});
test('admin completion rejects stale previews, unreviewed or foreign evidence, expired MFA and changed report or account state',async()=>{
 const r=await ready(),p=await preview(r.report.id),body=input(r,p),path=`/admin/reports/${r.report.id}/complete-on-behalf`;
 assert.equal((await call(other,`/admin/reports/${r.report.id}/completion-preview`)).status,403);assert.equal((await call(admin,path,'POST',{...body,checked:false})).status,400);assert.equal((await call(admin,path,'POST',{...body,evidence_ids:[await asset('evidence',other)]})).status,400);assert.equal((await call(admin,path,'POST',{...body,preview_token:'bad'})).status,400);
 const service=f.app.get(AdminAuthService),decoded=JSON.parse(service.secrets.decrypt(p.preview_token)),expired=service.secrets.encrypt(JSON.stringify({...decoded,expires_at:new Date(0).toISOString()}));assert.equal((await call(admin,path,'POST',{...body,preview_token:expired})).status,409);
 await enroll(other);assert.equal((await call(other,path,'POST',body)).status,409);
 await f.pool.query("UPDATE admin_sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",[admin.id]);assert.equal((await call(admin,path,'POST',body)).status,403);assert.equal((await call(admin,`/admin/reports/${r.report.id}/completion-preview`)).status,403);await f.pool.query('UPDATE admin_sessions SET verified_at=now() WHERE user_id=$1',[admin.id]);
 await call(customer,`/reports/${r.report.id}/updates`,'POST',{body:'DEMO new evidence context'});assert.equal((await call(admin,path,'POST',body)).status,409);
 const fresh=await preview(r.report.id),body2={...body,expected_version:2,preview_token:fresh.preview_token};
 await f.pool.query("UPDATE partners SET moderation_status='suspended' WHERE id=$1",[partner]);assert.equal((await call(admin,path,'POST',body2)).status,409);await f.pool.query("UPDATE partners SET moderation_status='active' WHERE id=$1",[partner]);
 await f.pool.query("UPDATE reports SET state='closed' WHERE id=$1",[r.report.id]);assert.equal((await call(admin,path,'POST',body2)).status,409);assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');
});
test('admin and worker settlement race yields one posting and rolls back atomically when the event fails',async()=>{
 const r=await ready(),p=await preview(r.report.id),body=input(r,p),path=`/admin/reports/${r.report.id}/complete-on-behalf`,key=randomUUID();
 await f.pool.query("CREATE FUNCTION fail_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$");await f.pool.query('CREATE TRIGGER fail_completion BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fail_completion()');
 assert.equal((await call(admin,path,'POST',body,key)).status,500);assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');assert.equal((await f.pool.query('SELECT count(*) FROM admin_completion_evidence')).rows[0].count,'0');assert.equal((await call(customer,`/reports/${r.report.id}`)).body.version,1);
 await f.pool.query('DROP TRIGGER fail_completion ON outbox_events');
 const result=await Promise.all([call(admin,path,'POST',body,key),call(worker,`/invoices/${r.i.id}/settle`,'POST',{expected_version:r.i.version,version_id:r.i.version_id,received_in_full:true})]);assert.deepEqual(result.map(r=>r.status).sort(),[201,409]);assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'1');
 const winner=result.find(r=>r.status===201)!.body;assert.equal(winner.invoice.worker_receipt_confirmed_at!==null,winner.actor_kind==='worker');assert.equal(winner.invoice.review_eligible,false);
});
test('admin completion requires attached evidence and supports zero cash and zero invoices without zero entries',async()=>{
 const r=await ready('0','0','0',false);assert.equal((await call(admin,`/admin/reports/${r.report.id}/completion-preview`)).status,409);
 const evidence=await asset('evidence');await call(customer,`/reports/${r.report.id}/updates`,'POST',{body:'DEMO zero cash work verified',evidence_ids:[evidence]});r.report.version=2;r.evidence_ids=[evidence];const p=await preview(r.report.id);assert.equal(p.cash_due,'0');assert.equal(p.reward,'0');
 const result=await call(admin,`/admin/reports/${r.report.id}/complete-on-behalf`,'POST',input(r,p));assert.equal(result.status,201,JSON.stringify(result));assert.equal((await f.pool.query('SELECT count(*) FROM ledger_entries')).rows[0].count,'0');assert.equal(result.body.invoice.review_eligible,false);
});
test('admin full-point completion preserves an existing customer mark and rejects stale invoice versions or missing holds',async()=>{
 await f.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit,balance) VALUES($1,'POINT',150000)",[customer.id]);const r=await ready('100000','50000','150000'),old=await preview(r.report.id);
 r.i=(await call(customer,`/invoices/${r.i.id}/payment-reported`,'POST',{expected_version:r.i.version,version_id:r.i.version_id,confirmed:true})).body;assert.ok(r.i.customer_payment_reported_at);
 const path=`/admin/reports/${r.report.id}/complete-on-behalf`;assert.equal((await call(admin,path,'POST',input(r,old))).status,409);
 const p=await preview(r.report.id);assert.equal(p.cash_due,'0');assert.equal(p.reward,'0');
 await f.pool.query("UPDATE holds SET state='released',ended_at=now() WHERE reference_id=$1 AND kind='invoice_fee'",[r.i.id]);assert.equal((await call(admin,path,'POST',input(r,p))).status,409);assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');
 // The missing hold is a deliberate corruption fixture; create a second intact invoice for full-point settlement.
 const first=job;job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) SELECT customer_id,partner_id,'accepted',service_mode,address_snapshot,point,time_mode FROM jobs WHERE id=$1 RETURNING id",[first])).rows[0].id;await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) SELECT $1,partner_id,membership_id,assigned_by FROM assignments WHERE job_id=$2',[job,first]);
 await f.pool.query("UPDATE holds SET state='released',ended_at=now() WHERE reference_id=$1 AND state='active'",[r.i.id]);const next=await ready('100000','50000','150000');next.i=(await call(customer,`/invoices/${next.i.id}/payment-reported`,'POST',{expected_version:next.i.version,version_id:next.i.version_id,confirmed:true})).body;
 const p2=await preview(next.report.id),done=await call(admin,`/admin/reports/${next.report.id}/complete-on-behalf`,'POST',input(next,p2));assert.equal(done.status,201,JSON.stringify(done));assert.equal(done.body.invoice.customer_payment_reported_at,next.i.customer_payment_reported_at);assert.equal(done.body.invoice.worker_receipt_confirmed_at,null);assert.equal(done.body.invoice.review_eligible,false);assert.equal(done.body.invoice.reward,'0');
 await assert.rejects(f.pool.query('DELETE FROM admin_completion_evidence'));assert.ok(!f.logs.text().includes(p2.preview_token));assert.ok(!f.logs.text().includes(admin.mfa!));
});
test('assigned worker adds receipt after admin completion once without ledger changes and opens reviews only after both marks',async()=>{
 const r=await ready(),p=await preview(r.report.id);const completed=await call(admin,`/admin/reports/${r.report.id}/complete-on-behalf`,'POST',input(r,p));assert.equal(completed.status,201);
 const i=completed.body.invoice,path=`/invoices/${i.id}/receipt-confirmed`,body={expected_version:i.version,version_id:i.version_id,received_in_full:true},key=randomUUID();
 const ledger=JSON.stringify((await f.pool.query('SELECT * FROM ledger_entries ORDER BY id')).rows),settlements=JSON.stringify((await f.pool.query('SELECT * FROM settlements ORDER BY id')).rows);
 assert.equal((await call(customer,path,'POST',body)).status,403);assert.equal((await call(other,path,'POST',body)).status,404);
 assert.equal((await call(worker,path,'POST',{...body,version_id:randomUUID()})).status,409);
 const results=await Promise.all([call(worker,path,'POST',body,key),call(worker,path,'POST',body,key)]);assert.equal(results[0].status,201,JSON.stringify(results));assert.deepEqual(results[0],results[1]);contract('Invoice',results[0].body);
 assert.ok(results[0].body.worker_receipt_confirmed_at);assert.equal(results[0].body.review_eligible,false);
 assert.equal((await call(worker,path,'POST',{...body,expected_version:results[0].body.version})).status,409);
 const paid=await call(customer,`/invoices/${i.id}/payment-reported`,'POST',{expected_version:results[0].body.version,version_id:i.version_id,confirmed:true});assert.equal(paid.body.review_eligible,true);
 assert.equal(JSON.stringify((await f.pool.query('SELECT * FROM ledger_entries ORDER BY id')).rows),ledger);assert.equal(JSON.stringify((await f.pool.query('SELECT * FROM settlements ORDER BY id')).rows),settlements);
 assert.equal((await f.pool.query("SELECT count(*) FROM outbox_events WHERE event_type='invoice.receipt_confirmed.v1'")).rows[0].count,'1');
 await f.pool.query('UPDATE memberships SET active=false WHERE partner_id=$1 AND user_id=$2',[partner,worker.id]);assert.equal((await call(worker,path,'POST',body,key)).status,404);
});
