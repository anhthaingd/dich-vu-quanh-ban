import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
const ajv=new Ajv({strict:false});addFormats.default(ajv);ajv.addSchema(JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8')),'spec');
const validate=ajv.compile({$ref:'spec#/components/schemas/Invoice'});
const validateReview=ajv.compile({$ref:'spec#/components/schemas/Review'});
let f:Awaited<ReturnType<typeof databaseFixture>>;
type Actor={token:string;id:string};let customer:Actor,worker:Actor,other:Actor,partner:string,job:string;
async function call(a:Actor,path:string,method='GET',body?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
}
async function actor(name:string){const r=await fetch(f.base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'@example.test',display_name:name,password:'Invoice test password 2026'})});const a=await r.json();return {id:a.user.id,token:a.access_token};}
beforeEach(async()=>{
 f=await databaseFixture('test-secret-'.repeat(4),true);customer=await actor('customer');worker=await actor('worker');other=await actor('other');
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

async function ready() {
 let i=await draft('0','0'); i=(await change(worker,i,'send')).body;
 i=(await change(customer,i,'confirm',{points_used:'0'})).body;
 i=(await change(worker,i,'settle',{received_in_full:true})).body.invoice;
 return (await change(customer,i,'payment-reported',{confirmed:true})).body;
}
async function write(a:Actor,stars=5){return call(a,`/jobs/${job}/reviews`,'POST',{stars,body:'DEMO review'});}
test('reviews require settlement and both payment marks; concurrent requests create one per direction',async()=>{
 assert.equal((await write(customer)).status,409);
 let i=await draft('0','0');i=(await change(worker,i,'send')).body;i=(await change(customer,i,'confirm',{points_used:'0'})).body;
 assert.equal((await write(worker)).status,409);
 i=(await change(worker,i,'settle',{received_in_full:true})).body.invoice;
 assert.equal((await write(customer)).status,409);
 await change(customer,i,'payment-reported',{confirmed:true});
 const key=randomUUID(),input={stars:5,body:'DEMO'};
 const results=await Promise.all([call(customer,`/jobs/${job}/reviews`,'POST',input,key),call(customer,`/jobs/${job}/reviews`,'POST',input,key)]);
 assert.equal(results[0].status,201);assert.deepEqual(results[0],results[1]);assert.ok(validateReview(results[0].body),JSON.stringify(validateReview.errors));
 assert.equal((await write(customer)).status,409);
 const two=await Promise.all([write(worker,4),write(worker,3)]);assert.deepEqual(two.map(x=>x.status).sort(),[201,409]);
 assert.equal((await call(customer,`/jobs/${job}/reviews`)).body.items.length,2);
 assert.equal((await call(customer,`/jobs/${job}/reviews`,'POST',{...input,stars:1},key)).status,409);
});
test('reviews preserve audit, CAS and admin hidden across edit and own removal; public excludes customer reviews',async()=>{
 await ready();await f.pool.query("UPDATE partners SET publication_status='published' WHERE id=$1",[partner]);
 let r=(await write(customer)).body;await write(worker,1);
 const pub=()=>call(other,`/partners/${partner}/reviews`);
 assert.equal((await pub()).body.items.length,1);assert.equal((await pub()).body.items[0].direction,'customer_to_partner');
 assert.equal((await call(other,`/jobs/${job}/reviews`)).status,404);
 assert.equal((await call(worker,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:1})).status,403);
 const old=r.version;r=(await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:4,body:'Edited'})).body;
 assert.equal(r.stars,4);assert.equal((await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:old,stars:1})).status,409);
 r=(await call(customer,`/reviews/${r.id}/visibility`,'POST',{expected_version:r.version,removed:true})).body;
 assert.equal((await pub()).body.items.length,0);
 await f.pool.query('UPDATE reviews SET hidden_at=now() WHERE id=$1',[r.id]);
 r=(await call(customer,`/reviews/${r.id}/visibility`,'POST',{expected_version:r.version,removed:false})).body;
 assert.equal(r.hidden,true);assert.equal(r.removed,false);assert.equal((await pub()).body.items.length,0);
 r=(await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:5})).body;
 assert.equal(r.hidden,true);assert.equal((await pub()).body.items.length,0);
 await f.pool.query('UPDATE reviews SET hidden_at=NULL WHERE id=$1',[r.id]);assert.equal((await pub()).body.items.length,1);
 assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action LIKE 'review.%'")).rows[0].count,'6');
 await assert.rejects(f.pool.query("DELETE FROM audit_events WHERE action='review.edit'"));
});
test('review rights are checked on retry and current membership; pagination is actor and scope bound',async()=>{
 await ready();const m=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1 AND user_id=$2',[partner,worker.id])).rows[0];
 await f.pool.query('UPDATE memberships SET is_owner=false WHERE id=$1',[m.id]);
 assert.equal((await write(worker)).status,403);
 await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'reviews.write',$2)",[m.id,worker.id]);
 const key=randomUUID(),input={stars:3};assert.equal((await call(worker,`/jobs/${job}/reviews`,'POST',input,key)).status,201);
 await write(customer);const p=(await call(customer,`/jobs/${job}/reviews?limit=1`)).body;assert.ok(p.next_cursor);
 assert.equal((await call(customer,`/jobs/${job}/reviews?cursor=${p.next_cursor}`)).body.items.length,1);
 assert.equal((await call(worker,`/jobs/${job}/reviews?cursor=${p.next_cursor}`)).status,400);
 await f.pool.query('UPDATE memberships SET active=false WHERE id=$1',[m.id]);
 assert.equal((await call(worker,`/jobs/${job}/reviews`,'POST',input,key)).status,404);
 assert.equal((await call(worker,`/jobs/${job}/reviews`)).status,404);
});
test('review input rejects invalid stars, forged direction, foreign assets and missing resources',async()=>{
 await ready();
 for(const input of [{stars:0},{stars:6},{stars:1.5},{stars:5,body:2},{stars:5,direction:'partner_to_customer'},{stars:5,asset_id:randomUUID()}])assert.equal((await call(customer,`/jobs/${job}/reviews`,'POST',input)).status,400);
 assert.equal((await call(other,`/jobs/${job}/reviews`,'POST',{stars:5})).status,404);
 assert.equal((await call(customer,`/jobs/${randomUUID()}/reviews`)).status,404);
 assert.equal((await call(customer,`/reviews/${randomUUID()}`,'PATCH',{stars:5,expected_version:1})).status,404);
 assert.equal((await call(other,`/partners/${partner}/reviews`)).status,404);
 const r=(await write(customer)).body;
 for(const input of [{expected_version:0,removed:true},{expected_version:1,removed:'yes'},{expected_version:1,removed:true,reason:1}])assert.equal((await call(customer,`/reviews/${r.id}/visibility`,'POST',input)).status,400);
});
test('public search ratings count only visible customer-to-partner reviews and become null when none remain',async()=>{
 await ready();await f.pool.query("UPDATE partners SET publication_status='published',accepting_jobs=true WHERE id=$1",[partner]);
 const skill=(await f.pool.query('SELECT id FROM skills WHERE active LIMIT 1')).rows[0].id;
 await f.pool.query("INSERT INTO partner_skills(partner_id,skill_id,modes) VALUES($1,$2,ARRAY['at_shop'])",[partner,skill]);
 await f.pool.query("INSERT INTO partner_locations(partner_id,address_text,point,public) VALUES($1,'DEMO',ST_SetSRID(ST_MakePoint(105,21),4326)::geography,true)",[partner]);
 const first=(await write(customer,5)).body;await write(worker,1);
 const secondJob=(await f.pool.query('INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) SELECT customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode FROM jobs WHERE id=$1 RETURNING id',[job])).rows[0].id;
 const second=(await f.pool.query("INSERT INTO reviews(job_id,direction,author_id,stars) VALUES($1,'customer_to_partner',$2,1) RETURNING id",[secondJob,customer.id])).rows[0];
 const stats=async()=>{const r=await call(other,'/partners?latitude=21&longitude=105&sort=distance');assert.equal(r.status,200);const p=r.body.items.find((x:{id:string})=>x.id===partner);return {stars:p.stars,count:p.review_count};};
 assert.deepEqual(await stats(),{stars:3,count:2});
 await f.pool.query('UPDATE reviews SET hidden_at=now() WHERE id=$1',[second.id]);assert.deepEqual(await stats(),{stars:5,count:1});
 await call(customer,`/reviews/${first.id}/visibility`,'POST',{expected_version:first.version,removed:true});assert.deepEqual(await stats(),{stars:null,count:0});
 const page=(await call(other,`/partners/${partner}/reviews`)).body;assert.deepEqual(page.items,[]);
 await f.pool.query('UPDATE reviews SET hidden_at=NULL WHERE id=$1',[second.id]);assert.deepEqual(await stats(),{stars:1,count:1});
});
test('review replies enforce recipient grants, shared version, retry and immutable audit without changing stars',async()=>{
 await ready();let r=(await write(customer)).body;
 assert.deepEqual(r.allowed_actions,['edit','visibility']);assert.equal(r.reply,null);
 assert.equal((await call(customer,`/reviews/${r.id}/reply`,'PUT',{expected_version:1,body:'Own'})).status,403);
 assert.equal((await call(other,`/reviews/${r.id}/reply`,'PUT',{expected_version:1,body:'Foreign'})).status,404);
 assert.equal((await call(worker,`/reviews/${r.id}/reply`,'PUT',{expected_version:1,body:'  '})).status,400);
 const input={expected_version:1,body:'DEMO thank you'},key=randomUUID();
 const pair=await Promise.all([call(worker,`/reviews/${r.id}/reply`,'PUT',input,key),call(worker,`/reviews/${r.id}/reply`,'PUT',input,key)]);
 assert.equal(pair[0].status,200);assert.deepEqual(pair[0],pair[1]);r=pair[0].body;assert.equal(validateReview(r),true,JSON.stringify(validateReview.errors));assert.equal(r.reply.body,input.body);assert.equal(r.reply.author_id,worker.id);assert.equal(r.version,2);assert.equal(r.stars,5);assert.deepEqual(r.allowed_actions,['reply']);
 assert.equal((await call(worker,`/reviews/${r.id}/reply`,'PUT',{expected_version:1,body:'Stale'})).status,409);
 await f.pool.query('UPDATE reviews SET hidden_at=now(),removed_at=now() WHERE id=$1',[r.id]);
 r=(await call(worker,`/reviews/${r.id}/reply`,'PUT',{expected_version:2,body:'Edited reply'})).body;assert.equal(r.hidden,true);assert.equal(r.removed,true);assert.equal(r.stars,5);
 assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action='review.reply'")).rows[0].count,'2');
 await f.pool.query('UPDATE memberships SET is_owner=false WHERE partner_id=$1',[partner]);
 assert.equal((await call(worker,`/reviews/${r.id}/reply`,'PUT',input,key)).status,403);
 const m=(await f.pool.query('SELECT id FROM memberships WHERE partner_id=$1',[partner])).rows[0].id;
 await f.pool.query("INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'reviews.respond',$2)",[m,worker.id]);
 assert.equal((await call(worker,`/reviews/${r.id}/reply`,'PUT',input,key)).status,200);
 await f.pool.query('UPDATE memberships SET is_owner=true WHERE id=$1',[m]);
 const received=(await write(worker,4)).body;
 assert.equal((await call(customer,`/reviews/${received.id}/reply`,'PUT',{expected_version:1,body:'Customer reply'})).body.reply.author_id,customer.id);
});
async function photo(a:Actor){
 const bytes=await sharp({create:{width:24,height:24,channels:3,background:'#2457d6'}}).png().toBuffer();
 const grant=(await call(a,'/assets/upload-grants','POST',{purpose:'review',mime:'image/png',bytes:bytes.length})).body;
 assert.equal((await fetch(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:bytes})).status,200);
 const asset=await call(a,`/assets/${grant.asset_id}/complete`,'POST',{expected_version:1});assert.equal(asset.status,201);return asset.body;
}
test('review photos recheck public visibility and private membership at signed URL reads and preserve omitted assets',async()=>{
 await ready();await f.pool.query("UPDATE partners SET publication_status='published' WHERE id=$1",[partner]);
 const image=await photo(customer);const anonymous=async(id:string)=>fetch(f.base+'/assets/'+id);
 assert.equal((await anonymous(image.id)).status,404);assert.equal((await call(other,'/assets/'+image.id)).status,404);
 let r=(await call(customer,`/jobs/${job}/reviews`,'POST',{stars:5,asset_id:image.id})).body;assert.equal(r.asset_id,image.id);
 const publicAsset=await (await anonymous(image.id)).json();assert.equal((await fetch(publicAsset.download_url)).status,200);
 assert.equal((await call(other,'/assets/'+image.id)).status,200);
 const pub=(await call(other,`/partners/${partner}/reviews`)).body.items[0];assert.equal(pub.asset_id,image.id);assert.deepEqual(pub.allowed_actions,[]);
 r=(await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:4})).body;assert.equal(r.asset_id,image.id);
 r=(await call(customer,`/reviews/${r.id}/visibility`,'POST',{expected_version:r.version,removed:true})).body;
 assert.equal((await fetch(publicAsset.download_url)).status,404);assert.equal((await anonymous(image.id)).status,404);
 const privateAsset=(await call(worker,'/assets/'+image.id)).body;assert.equal((await fetch(privateAsset.download_url)).status,200);
 await f.pool.query('UPDATE memberships SET active=false WHERE partner_id=$1',[partner]);assert.equal((await fetch(privateAsset.download_url)).status,404);
 await f.pool.query('UPDATE memberships SET active=true WHERE partner_id=$1',[partner]);
 r=(await call(customer,`/reviews/${r.id}/visibility`,'POST',{expected_version:r.version,removed:false})).body;
 await f.pool.query('UPDATE reviews SET hidden_at=now() WHERE id=$1',[r.id]);assert.equal((await fetch(publicAsset.download_url)).status,404);
 await f.pool.query('UPDATE reviews SET hidden_at=NULL WHERE id=$1',[r.id]);
 const second=await photo(customer);r=(await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:4,asset_id:second.id})).body;
 assert.equal(r.asset_id,second.id);assert.equal((await fetch(publicAsset.download_url)).status,404);
 r=(await call(customer,`/reviews/${r.id}`,'PATCH',{expected_version:r.version,stars:4,asset_id:null})).body;assert.equal(r.asset_id,null);assert.equal((await anonymous(second.id)).status,404);
 const privateImage=await photo(worker);const privateReview=(await call(worker,`/jobs/${job}/reviews`,'POST',{stars:4,asset_id:privateImage.id})).body;
 assert.equal(privateReview.asset_id,privateImage.id);assert.equal((await anonymous(privateImage.id)).status,404);assert.equal((await call(customer,'/assets/'+privateImage.id)).status,200);assert.equal((await call(other,'/assets/'+privateImage.id)).status,404);
});
test('customer history is contextual, paginated, visibility filtered and omits unrelated job and provider identifiers',async()=>{
 await ready();const written=await write(worker,4);assert.equal(written.status,201);
 const context=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'requested','at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now') RETURNING id",[customer.id,partner,JSON.stringify({text:'OTHER PRIVATE ADDRESS',point:{latitude:21,longitude:105}})])).rows[0].id;
 const path=`/jobs/${context}/customer-reviews`;assert.equal((await call(customer,path)).status,403);assert.equal((await call(other,path)).status,404);
 const result=await call(worker,path+'?limit=1');assert.equal(result.status,200);assert.equal(result.body.items.length,1);
 const row=result.body.items[0];assert.deepEqual(Object.keys(row).sort(),['body','created_at','id','reply','stars']);assert.equal(row.stars,4);
 for(const secret of [job,partner,worker.id,'OTHER PRIVATE ADDRESS'])assert.ok(!JSON.stringify(result.body).includes(secret));
 await f.pool.query('UPDATE reviews SET hidden_at=now() WHERE id=$1',[written.body.id]);assert.equal((await call(worker,path)).body.items.length,0);
 await f.pool.query('UPDATE reviews SET hidden_at=NULL,removed_at=now() WHERE id=$1',[written.body.id]);assert.equal((await call(worker,path)).body.items.length,0);
 await f.pool.query('UPDATE memberships SET active=false WHERE partner_id=$1 AND user_id=$2',[partner,worker.id]);assert.equal((await call(worker,path)).status,404);
});
