import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {databaseFixture} from '../helpers/database.js';
const ajv=new Ajv({strict:false});addFormats.default(ajv);ajv.addSchema(JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8')),'spec');
const validate=ajv.compile({$ref:'spec#/components/schemas/Report'});
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={id:string;token:string};let customer:Actor,worker:Actor,other:Actor,job:string,partner:string;
const input={kind:'account',subject:'DEMO support',body:'Please check my concern',evidence_ids:[]};
async function call(a:Actor|undefined,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{...(a?{Authorization:'Bearer '+a.token}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
}
async function actor(name:string){const r=await call(undefined,'/auth/register','POST',{email:name+'@example.test',display_name:name,password:'DEMO support password 2026'});return {id:r.body.user.id,token:r.body.access_token};}
beforeEach(async()=>{
 f=await databaseFixture('test-secret-'.repeat(4),true);customer=await actor('customer');worker=await actor('worker');other=await actor('other');
 partner=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO support') RETURNING id")).rows[0].id;
 await f.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true)',[partner,worker.id]);
 job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now') RETURNING id",[customer.id,partner,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105}})])).rows[0].id;
});
afterEach(async()=>{await f?.close();});
test('support creates private reports with immutable retry and actor-bound pagination without changing jobs or money',async()=>{
 const key=randomUUID(),payload={...input,kind:'service',job_id:job};
 const [a,b]=await Promise.all([call(customer,'/reports','POST',payload,key),call(customer,'/reports','POST',payload,key)]);
 assert.equal(a.status,201);assert.deepEqual(a,b);assert.equal(validate(a.body),true,JSON.stringify(validate.errors));
 assert.equal((await call(customer,'/reports','POST',{...payload,body:'Changed'},key)).status,409);
 assert.equal((await call(worker,`/reports/${a.body.id}`)).status,404);
 assert.equal((await call(worker,`/reports/${a.body.id}/updates`,'POST',{body:'Cannot join'})).status,404);
 assert.equal((await call(undefined,'/reports')).status,401);
 await call(customer,'/reports','POST',input);await call(other,'/reports','POST',input);
 const page=(await call(customer,'/reports?limit=1')).body;assert.ok(page.next_cursor);
 assert.equal((await call(customer,'/reports?cursor='+page.next_cursor)).body.items.length,1);
 assert.equal((await call(other,'/reports?cursor='+page.next_cursor)).status,400);
 assert.equal((await call(worker,'/reports')).body.items.length,0);
 assert.equal((await f.pool.query('SELECT state FROM jobs WHERE id=$1',[job])).rows[0].state,'accepted');
 assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');
 assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action='report.create'")).rows[0].count,'3');
});
test('support updates serialize, hide admin-only content, reopen awaiting evidence and preserve closed history',async()=>{
 const r=(await call(customer,'/reports','POST',input)).body;
 await f.pool.query("INSERT INTO report_updates(report_id,actor_id,body,visibility) VALUES($1,$2,'PRIVATE ADMIN NOTE','admin_only'),($1,$2,'Please add details','participants')",[r.id,worker.id]);
 await f.pool.query("UPDATE reports SET state='awaiting_evidence' WHERE id=$1",[r.id]);
 const key=randomUUID(),payload={body:'More information'};
 const results=await Promise.all([call(customer,`/reports/${r.id}/updates`,'POST',payload,key),call(customer,`/reports/${r.id}/updates`,'POST',payload,key)]);
 assert.equal(results[0].status,201);assert.deepEqual(results[0],results[1]);assert.equal(results[0].body.version,2);assert.equal(results[0].body.state,'reviewing');assert.equal(results[0].body.updates.length,2);assert.ok(!JSON.stringify(results).includes('PRIVATE ADMIN'));
 await Promise.all([call(customer,`/reports/${r.id}/updates`,'POST',{body:'One'}),call(customer,`/reports/${r.id}/updates`,'POST',{body:'Two'})]);
 assert.equal((await call(customer,`/reports/${r.id}`)).body.version,4);
 await f.pool.query("UPDATE reports SET state='closed' WHERE id=$1",[r.id]);
 assert.equal((await call(customer,`/reports/${r.id}/updates`,'POST',{body:'After close'})).status,409);
 assert.deepEqual(await call(customer,`/reports/${r.id}/updates`,'POST',payload,key),results[0]);
 const saved=(await call(customer,`/reports/${r.id}`)).body;assert.equal(saved.state,'closed');assert.equal(saved.updates.length,4);assert.equal(validate(saved),true,JSON.stringify(validate.errors));
 assert.equal((await call(customer,`/reports/${randomUUID()}`)).status,404);
 await assert.rejects(f.pool.query("DELETE FROM audit_events WHERE action='report.update'"));
});
test('support checks exact invoice and review resources, current membership and preserves reporter history after leaving',async()=>{
 const invoice=(await f.pool.query('INSERT INTO invoices(job_id) VALUES($1) RETURNING id',[job])).rows[0].id;
 const version=(await f.pool.query('INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials) VALUES($1,1,$2,0,0) RETURNING id',[invoice,worker.id])).rows[0].id;
 const p={...input,kind:'invoice',invoice_id:invoice,invoice_version_id:version};
 assert.equal((await call(customer,'/reports','POST',p)).status,404);
 assert.equal((await call(worker,'/reports','POST',p)).status,201);
 await f.pool.query('UPDATE invoice_versions SET sent_at=now() WHERE id=$1',[version]);
 assert.equal((await call(customer,'/reports','POST',p)).status,201);
 for(const patch of [{invoice_version_id:randomUUID()},{job_id:randomUUID()},{invoice_id:randomUUID()}])assert.equal((await call(customer,'/reports','POST',{...p,...patch})).status,404);
 assert.equal((await call(other,'/reports','POST',p)).status,404);
 const review=(await f.pool.query("INSERT INTO reviews(job_id,direction,author_id,stars) VALUES($1,'customer_to_partner',$2,4) RETURNING id",[job,customer.id])).rows[0].id;
 const rp={...input,kind:'review',review_id:review};assert.equal((await call(worker,'/reports','POST',rp)).status,201);
 assert.equal((await call(other,'/reports','POST',rp)).status,404);
 for(const patch of [{review_id:randomUUID()},{job_id:randomUUID()}])assert.equal((await call(customer,'/reports','POST',{...rp,...patch})).status,404);
 await f.pool.query('UPDATE memberships SET is_owner=false WHERE user_id=$1',[worker.id]);
 const membership=(await f.pool.query('SELECT id FROM memberships WHERE user_id=$1',[worker.id])).rows[0].id;
 await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'reviews.respond',$2)",[membership,worker.id]);
 assert.equal((await call(worker,'/reports','POST',rp)).status,201);
 await f.pool.query('UPDATE memberships SET is_owner=true WHERE user_id=$1',[worker.id]);
 const own=(await call(worker,'/reports','POST',{...input,kind:'service',job_id:job})).body;
 await f.pool.query('UPDATE memberships SET active=false WHERE user_id=$1',[worker.id]);
 assert.equal((await call(worker,'/reports','POST',{...input,kind:'service',job_id:job})).status,404);
 assert.equal((await call(worker,`/reports/${own.id}`)).status,200);
 assert.equal((await call(worker,`/reports/${own.id}/updates`,'POST',{body:'My own case'})).status,201);
});
async function photo(a:Actor){
 const bytes=await sharp({create:{width:10,height:10,channels:3,background:'blue'}}).png().toBuffer();
 const grant=(await call(a,'/assets/upload-grants','POST',{purpose:'evidence',mime:'image/png',bytes:bytes.length})).body;
 assert.equal((await fetch(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:bytes})).status,200);
 const complete=await call(a,`/assets/${grant.asset_id}/complete`,'POST',{expected_version:1});assert.equal(complete.status,201);return complete.body;
}
test('support evidence uploads are private, tied to the submitted message and rolled back with invalid evidence',async()=>{
 const a=await photo(customer),b=await photo(customer),foreign=await photo(other);
 const bad=await call(customer,'/reports','POST',{...input,evidence_ids:[a.id,foreign.id]});assert.equal(bad.status,400);assert.equal((await f.pool.query('SELECT count(*) FROM reports')).rows[0].count,'0');
 const r=(await call(customer,'/reports','POST',{...input,evidence_ids:[a.id]})).body;assert.deepEqual(r.evidence_ids,[a.id]);
 const next=(await call(customer,`/reports/${r.id}/updates`,'POST',{body:'Another photo',evidence_ids:[b.id]})).body;
 assert.deepEqual(next.evidence_ids,[a.id]);assert.deepEqual(next.updates[0].evidence_ids,[b.id]);
 assert.equal((await call(customer,`/reports/${r.id}/updates`,'POST',{body:'Wrong',evidence_ids:[foreign.id]})).status,400);
 assert.equal((await call(customer,`/reports/${r.id}`)).body.version,2);
 assert.equal((await call(other,`/assets/${a.id}`)).status,404);assert.equal((await call(undefined,`/assets/${a.id}`)).status,404);
 assert.equal((await fetch(a.download_url)).status,200);
 await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[customer.id]);assert.equal((await fetch(a.download_url)).status,404);
});
test('support rejects forged fields, inconsistent resource references, blank content and invalid evidence',async()=>{
 for(const patch of [{kind:'admin'},{body:' '},{subject:''},{body:5},{kind:'invoice'},{kind:'review'},{invoice_version_id:randomUUID()},{invoice_id:randomUUID()},{review_id:randomUUID()},{reporter_id:other.id},{state:'closed'},{evidence_ids:'bad'},{evidence_ids:[job,job]},{evidence_ids:[job]}])assert.equal((await call(customer,'/reports','POST',{...input,...patch})).status,400,JSON.stringify(patch));
 const r=(await call(customer,'/reports','POST',input)).body;
 for(const p of [{body:''},{body:7},{body:'Text',visibility:'admin_only'},{body:'Text',evidence_ids:[randomUUID()]}])assert.equal((await call(customer,`/reports/${r.id}/updates`,'POST',p)).status,400);
 assert.equal((await call(customer,'/reports?unexpected=yes')).status,400);
});
