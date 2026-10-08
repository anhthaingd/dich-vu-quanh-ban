import {readFile} from 'node:fs/promises';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
const ajv=new Ajv({strict:false});addFormats.default(ajv);ajv.addSchema(JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8')),'spec');
const validate=ajv.compile({$ref:'spec#/components/schemas/Invoice'});
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={token:string;id:string};let customer:Actor,worker:Actor,other:Actor,partner:string,job:string;
async function call(a:Actor,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
}
async function actor(name:string){const r=await fetch(f.base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'@example.test',display_name:name,password:'Invoice test password 2026'})});const a=await r.json();return {id:a.user.id,token:a.access_token};}
beforeEach(async()=>{
 f=await databaseFixture('test-secret-'.repeat(4));customer=await actor('customer');worker=await actor('worker');other=await actor('other');
 partner=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO invoices') RETURNING id")).rows[0].id;
 const m=(await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true) RETURNING id',[partner,worker.id])).rows[0].id;
 await f.pool.query("INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",[partner]);
 job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now') RETURNING id",[customer.id,partner,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105}})])).rows[0].id;
 await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[job,partner,m,worker.id]);
});
afterEach(async()=>{await f?.close();});
async function draft(labor='100000',materials='50000'){
 const asset=(await f.pool.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status) VALUES($1,$2,'result','image/png',1,'ready') RETURNING id",[worker.id,randomUUID()])).rows[0].id;
 const r=await call(worker,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:1,labor,materials,result_asset_ids:[asset]});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(validate(r.body),true,JSON.stringify(validate.errors));return r.body;
}
async function change(a:Actor,i:Record<string,unknown>,action:string,extra:Record<string,unknown>={}){
 const body={expected_version:i.version,...(action==='send'?{draft_version_id:i.version_id}:action==='revision-requests'?{}:{version_id:i.version_id}),...extra};return call(a,`/invoices/${i.id}/${action}`,'POST',body);
}
test('invoice version, worker ACL, immutable sent data, settlement first and two payment marks',async()=>{
 let i=await draft();assert.equal((await call(customer,`/jobs/${job}/invoice`)).status,404);
 assert.equal((await change(customer,i,'send')).status,403);assert.equal((await call(other,`/jobs/${job}/invoice`)).status,404);
 i=(await change(worker,i,'send')).body;assert.equal(i.state,'sent');
 await assert.rejects(f.pool.query('UPDATE invoice_versions SET labor=1 WHERE id=$1',[i.version_id]));
 await assert.rejects(f.pool.query('DELETE FROM invoice_assets WHERE version_id=$1',[i.version_id]));
 i=(await change(customer,i,'confirm',{points_used:'0'})).body;assert.equal(i.state,'locked');
 assert.equal((await call(customer,`/jobs/${job}`)).body.allowed_actions.includes('stop'),false);
 const key=randomUUID(),body={expected_version:i.version,version_id:i.version_id,received_in_full:true};
 const [s1,s2]=await Promise.all([call(worker,`/invoices/${i.id}/settle`,'POST',body,key),call(worker,`/invoices/${i.id}/settle`,'POST',body,key)]);
 assert.equal(s1.status,201,JSON.stringify(s1.body));assert.deepEqual(s1,s2);i=s1.body.invoice;assert.equal(i.review_eligible,false);assert.equal((await call(customer,`/jobs/${job}`)).body.state,'completed');
 assert.deepEqual((await call(customer,'/me/points')).body,{balance:'2000',held:'0',available:'2000'});
 const wallet=(await call(worker,`/partners/${partner}/wallet`)).body;assert.equal(wallet.balance,'-10000');assert.equal(wallet.withdrawable,'0');
 i=(await change(customer,i,'payment-reported',{confirmed:true})).body;assert.equal(i.review_eligible,true);
 assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'1');
 assert.equal((await f.pool.query('SELECT sum(delta)::text AS total FROM ledger_entries GROUP BY unit HAVING sum(delta)<>0')).rows.length,0);
 await assert.rejects(f.pool.query('UPDATE ledger_entries SET delta=1'));await assert.rejects(f.pool.query('DELETE FROM invoice_confirmations'));
});
test('revision and confirmation race has one winner, no holds on revision; stale versions fail',async()=>{
 let i=await draft();i=(await change(worker,i,'send')).body;
 const [r,c]=await Promise.all([change(customer,i,'revision-requests',{reason:'DEMO correction'}),change(customer,i,'confirm',{points_used:'0'})]);
 assert.deepEqual([r.status,c.status].sort(),[201,409]);
 if(r.status===201){assert.equal((await f.pool.query('SELECT count(*) FROM holds')).rows[0].count,'0');i=r.body;const saved=await call(worker,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:i.version,labor:'0',materials:'0'});assert.equal(saved.status,200);assert.equal((await change(worker,saved.body,'send')).status,400);}
});
test('insufficient funds and points disclose no partner balance; zero invoice posts no zero entries',async()=>{
 let i=await draft('2000000');i=(await change(worker,i,'send')).body;
 let r=await change(customer,i,'confirm',{points_used:'0'});assert.equal(r.status,422);assert.equal(r.body.code,'PARTNER_FUNDING_REQUIRED');assert.equal('balance' in r.body,false);
 r=await change(customer,i,'confirm',{points_used:'1'});assert.equal(r.body.code,'INSUFFICIENT_POINTS');assert.equal((await f.pool.query('SELECT count(*) FROM holds')).rows[0].count,'0');
 i=(await change(customer,i,'revision-requests',{reason:'Zero test'})).body;
 i=(await call(worker,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:i.version,labor:'0',materials:'0',result_asset_ids:i.result_asset_ids})).body;
 i=(await change(worker,i,'send')).body;i=(await change(customer,i,'confirm',{points_used:'0'})).body;i=(await change(customer,i,'payment-reported',{confirmed:true})).body;
 const s=await change(worker,i,'settle',{received_in_full:true});assert.equal(s.status,201);assert.equal(s.body.invoice.review_eligible,true);assert.equal((await f.pool.query('SELECT count(*) FROM ledger_entries')).rows[0].count,'0');
});
test('two invoices compete for the same point balance; failure rolls back holds and settlement retry',async()=>{
 await f.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit,balance) VALUES($1,'POINT',50000)",[customer.id]);
 const firstJob=job;let first=await draft();first=(await change(worker,first,'send')).body;
 job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) SELECT customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode FROM jobs WHERE id=$1 RETURNING id",[job])).rows[0].id;
 await f.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) SELECT $1,partner_id,membership_id,assigned_by FROM assignments WHERE job_id=$2',[job,firstJob]);
 let second=await draft();second=(await change(worker,second,'send')).body;
 const results=await Promise.all([change(customer,first,'confirm',{points_used:'50000'}),change(customer,second,'confirm',{points_used:'50000'})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,422]);
 assert.equal((await call(customer,'/me/points')).body.available,'0');const locked=results.find(r=>r.status===201)!.body;
 await f.pool.query("CREATE FUNCTION fail_invoice_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$");await f.pool.query('CREATE TRIGGER fail_invoice_event BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fail_invoice_event()');
 const key=randomUUID(),body={expected_version:locked.version,version_id:locked.version_id,received_in_full:true};
 assert.equal((await call(worker,`/invoices/${locked.id}/settle`,'POST',body,key)).status,500);
 assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');assert.equal((await call(customer,'/me/points')).body.held,'50000');
 await f.pool.query('DROP TRIGGER fail_invoice_event ON outbox_events');const settled=await call(worker,`/invoices/${locked.id}/settle`,'POST',body,key);assert.equal(settled.status,201);
 assert.equal((await call(customer,'/me/points')).body.balance,'1333');assert.equal((await call(worker,`/partners/${partner}/wallet`)).body.balance,'40000');
 const page=await call(customer,'/me/points/ledger?limit=1');assert.equal(page.body.items.length,1);assert.ok(page.body.next_cursor);assert.equal((await call(customer,'/me/points/ledger?cursor='+encodeURIComponent(page.body.next_cursor))).body.items.length,1);
 assert.equal((await call(other,'/me/points/ledger?cursor='+encodeURIComponent(page.body.next_cursor))).status,400);assert.equal((await call(customer,`/partners/${partner}/ledger`)).status,404);
});

test('revision drafts stay private; sent assets cannot be moved; journal balances rebuild projection',async()=>{
 let i=await draft();i=(await change(worker,i,'send')).body;const sent=i;
 i=(await change(customer,i,'revision-requests',{reason:'DEMO correction'})).body;
 i=(await call(worker,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:i.version,labor:'250000',materials:'0',note:'Private draft',result_asset_ids:i.result_asset_ids})).body;
 const visible=(await call(customer,`/jobs/${job}/invoice`)).body;assert.equal(visible.version_id,sent.version_id);assert.equal(visible.labor,'100000');assert.equal(visible.state,'revision_requested');assert.equal(visible.revision_reason,'DEMO correction');assert.ok(validate(visible));
 await assert.rejects(f.pool.query('UPDATE invoice_assets SET version_id=$1 WHERE version_id=$2',[i.version_id,sent.version_id]));
 i=(await change(worker,i,'send')).body;i=(await change(customer,i,'confirm',{points_used:'0'})).body;await change(worker,i,'settle',{received_in_full:true});
 const projections=await f.pool.query('SELECT a.id,a.balance::text,COALESCE(sum(e.delta),0)::text AS rebuilt FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id=a.id GROUP BY a.id');for(const a of projections.rows)assert.equal(a.balance,a.rebuilt);
 await assert.rejects(f.pool.query("UPDATE holds SET state='active',ended_at=NULL"));
 await assert.rejects(f.pool.query("INSERT INTO ledger_entries(transaction_id,account_id,unit,delta,posting_code) SELECT transaction_id,account_id,unit,1,'late' FROM ledger_entries LIMIT 1"));
});

test('stop with agreed charges continues invoice; no-charge stopped job cannot confirm or reserve money',async()=>{
 const j=(await call(worker,`/jobs/${job}`)).body;
 const stopped=await call(worker,`/jobs/${job}/stop`,'POST',{expected_version:j.version,reason:'DEMO stop with agreed charges',has_agreed_charges:true});assert.equal(stopped.status,201);assert.equal(stopped.body.state,'accepted');
 let i=await draft();i=(await change(worker,i,'send')).body;
 const closed=await call(customer,`/jobs/${job}/stop`,'POST',{expected_version:stopped.body.version,reason:'DEMO no charges',has_agreed_charges:false});assert.equal(closed.status,201);assert.equal(closed.body.state,'stopped');
 assert.equal((await change(customer,i,'confirm',{points_used:'0'})).status,409);assert.equal((await change(customer,i,'revision-requests',{reason:'Blocked after stop'})).status,409);
 assert.equal((await f.pool.query('SELECT count(*) FROM holds')).rows[0].count,'0');
});
