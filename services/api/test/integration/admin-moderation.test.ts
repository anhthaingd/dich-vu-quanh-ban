import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
const ajv=new Ajv({strict:false});addFormats.default(ajv);ajv.addSchema(JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8')),'spec');
function contract(name:string,value:unknown){const validate=ajv.getSchema('spec#/components/schemas/'+name)!;assert.ok(validate(value),JSON.stringify(validate.errors));}
import {databaseFixture} from '../helpers/database.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
const password='DEMO admin password 2026';
type User={token:string;id:string;mfa?:string;secret?:string;refresh?:string};
async function call(u:User|undefined,path:string,method='GET',data?:unknown,key=randomUUID()){const response=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':key,...(u?{Authorization:'Bearer '+u.token}:{}),...(u?.mfa?{'X-Admin-Session':u.mfa}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,body:await response.json()};}
async function user(permissions:string[]=[]):Promise<User>{const r=await call(undefined,'/auth/register','POST',{email:randomUUID()+'@example.test',password,display_name:'DEMO account'});assert.equal(r.status,201);const u:User={token:r.body.access_token,id:r.body.user.id,refresh:r.body.refresh_token};for(const p of permissions)await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[u.id,p]);return u;}
async function enroll(u:User){const setup=await call(u,'/admin/auth/enrollment','POST',{password});assert.equal(setup.status,201,JSON.stringify(setup));u.secret=setup.body.secret;const result=await call(u,'/admin/auth/enrollment/confirm','POST',{password,code:totp(decode32(u.secret!),Math.floor(Date.now()/30000))});assert.equal(result.status,201,JSON.stringify(result));contract('AdminEnrollment',setup.body);contract('AdminSession',result.body);u.mfa=result.body.token;return u;}
async function partner(u:User){await f.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[u.id,'+849'+Math.floor(Math.random()*1e8).toString().padStart(8,'0')]);const p=(await call(u,'/partners','POST',{kind:'solo',name:'DEMO partner',bio:'DEMO'})).body;assert.ok(p.id,JSON.stringify(p));return p.id as string;}
async function photo(u:User,purpose:string){const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#cedada'}}).png().toBuffer();const g=await call(u,'/assets/upload-grants','POST',{purpose,mime:'image/png',bytes:bytes.length});assert.equal(g.status,201,JSON.stringify(g));const uploaded=await fetch(g.body.upload_url,{method:'PUT',headers:g.body.required_headers,body:bytes});assert.equal(uploaded.status,200);const complete=await call(u,`/assets/${g.body.asset_id}/complete`,'POST',{expected_version:1});assert.equal(complete.status,201,JSON.stringify(complete));return g.body.asset_id as string;}
beforeEach(async()=>{f=await databaseFixture('admin-test-auth-secret-'.repeat(3),true,undefined,false,{secret:'admin-test-private-secret-'.repeat(3)});});
afterEach(async()=>{await f.close();});
test('admin MFA requires grants, password, confirmed TOTP and rejects replay, expiry, revoked rights and locked sessions',async()=>{
 const outsider=await user();assert.equal((await call(outsider,'/admin/auth/status')).status,403);assert.equal((await call(outsider,'/admin/reports')).status,403);
 const a=await user(['support.read']);assert.equal((await call(a,'/admin/auth/enrollment','POST',{password:'wrong'})).status,403);assert.equal((await call(a,'/admin/reports')).status,403);
 await enroll(a);assert.equal((await call(a,'/admin/auth/status')).body.enrolled,true);assert.equal((await call(a,'/admin/reports')).status,200);assert.equal((await call(a,'/admin/reviews')).status,403);
 assert.equal((await call(a,'/admin/auth/verify','POST',{password,code:totp(decode32(a.secret!),Math.floor(Date.now()/30000))})).status,403);
 assert.equal((await call(a,'/admin/auth/enrollment','POST',{password})).status,409);
 const stolen={...outsider,mfa:a.mfa};assert.equal((await call(stolen,'/admin/reports')).status,403);
 await f.pool.query('UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1',[a.id]);assert.equal((await call(a,'/admin/reports')).status,403);
 await f.pool.query('UPDATE admin_grants SET revoked_at=NULL WHERE user_id=$1',[a.id]);
 const renewed=await call(undefined,'/auth/refresh','POST',{refresh_token:a.refresh});a.token=renewed.body.access_token;assert.equal((await call(a,'/admin/reports')).status,200);
 const otherLogin=(await f.pool.query("SELECT subject FROM identities WHERE user_id=$1 AND provider='email'",[a.id])).rows[0].subject;const separate=await call(undefined,'/auth/login','POST',{email:otherLogin,password});assert.equal((await call({...a,token:separate.body.access_token},'/admin/reports')).status,403);
 await call(a,'/admin/auth/lock','POST');assert.equal((await call(a,'/admin/reports')).status,403);
 const b=await enroll(await user(['support.read']));const fresh=await call(b,'/admin/auth/verify','POST',{password,code:totp(decode32(b.secret!),Math.floor(Date.now()/30000)+1)});assert.equal(fresh.status,201);b.mfa=fresh.body.token;await f.pool.query("UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",[b.id]);assert.equal((await call(b,'/admin/reports')).status,403);
 const c=await user(['support.read']);for(let i=0;i<10;i++)assert.equal((await call(c,'/admin/auth/enrollment','POST',{password:'wrong'})).status,403);assert.equal((await call(c,'/admin/auth/enrollment','POST',{password})).status,429);
 const plain=JSON.stringify((await f.pool.query('SELECT * FROM admin_factors')).rows);assert.ok(!plain.includes(a.secret!));assert.ok(!f.logs.text().includes(a.secret!));
});
test('admin support decisions preserve money and privacy with stale versions, retry, current permissions and closed history',async()=>{
 const sender=await user(),other=await user(),a=await enroll(await user(['support.read','support.manage','audit.read'])),b=await enroll(await user(['support.read','support.manage']));
 const evidence=await photo(sender,'evidence');const r=(await call(sender,'/reports','POST',{subject:'DEMO Support',body:'Help',kind:'account',evidence_ids:[evidence]})).body;
 assert.equal((await call(other,`/reports/${r.id}`)).status,404);
 assert.equal((await call(a,'/admin/reports?q=Support&state=open')).body.items.length,1);assert.equal((await call(a,'/admin/reports?state=unknown')).status,400);
 const img=await fetch(f.base+`/assets/${evidence}/admin-content`,{headers:{Authorization:'Bearer '+a.token,'X-Admin-Session':a.mfa!}});assert.equal(img.status,200);assert.equal((await f.pool.query("SELECT count(*) FROM audit_events WHERE action='admin.asset.read' AND resource_id=$1",[evidence])).rows[0].count,'1');
 const input={expected_version:1,state:'awaiting_evidence',reason:'Please supply DEMO details'},key=randomUUID();const first=await call(a,`/admin/reports/${r.id}/decision`,'POST',input,key);assert.equal(first.status,201,JSON.stringify(first));contract('AdminReport',first.body);assert.deepEqual(await call(a,`/admin/reports/${r.id}/decision`,'POST',input,key),first);
 assert.equal((await call(b,`/admin/reports/${r.id}/decision`,'POST',input)).status,409);
 assert.equal((await call(a,`/admin/reports/${r.id}/decision`,'POST',{...input,reason:'changed'},key)).status,409);
 assert.equal((await call(sender,`/reports/${r.id}`)).body.updates[0].body,input.reason);
 const next=(await call(sender,`/reports/${r.id}/updates`,'POST',{body:'DEMO additional details'})).body;
 const results=await Promise.all([call(a,`/admin/reports/${r.id}/decision`,'POST',{expected_version:next.version,state:'closed',reason:'Done'}),call(b,`/admin/reports/${r.id}/decision`,'POST',{expected_version:next.version,state:'resolved',reason:'Done'})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 assert.equal((await call(a,'/admin/moderation-audit')).body.items.length,2);
 await assert.rejects(f.pool.query('DELETE FROM moderation_history'));
 assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');
 await f.pool.query("UPDATE admin_sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",[a.id]);assert.equal((await call(a,`/admin/reports/${r.id}/decision`,'POST',input,key)).status,403);assert.equal((await call(a,'/admin/reports')).status,200);
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND permission='support.read'",[a.id]);assert.equal((await call(a,`/admin/reports/${r.id}`)).status,403);
});
test('verification encrypts declarations and files, requires ownership and reviewed evidence, preserves resubmission history and public badge',async()=>{
 const u=await user(),p=await partner(u),a=await enroll(await user(['moderation.manage'])),other=await user();
 const asset=await photo(u,'verification'),input={document_asset_ids:[asset],details:{kind:'identity',statement:'PRIVATE DEMO DECLARATION'}};
 assert.equal((await call(other,`/partners/${p}/verification`,'POST',input)).status,403);
 assert.equal((await call(u,`/partners/${p}/verification`,'POST',{...input,document_asset_ids:[randomUUID()]})).status,400);
 const key=randomUUID(),r=(await call(u,`/partners/${p}/verification`,'POST',input,key)).body;assert.ok(r.id,JSON.stringify(r));assert.equal(r.state,'pending');contract('Verification',r);
 assert.equal((await call(u,`/partners/${p}/verification`,'POST',input)).status,409);
 assert.deepEqual((await call(u,`/partners/${p}/verification`,'POST',input,key)).body,r);
 assert.equal((await call(a,'/admin/verifications?q=partner')).body.items[0].id,r.id);
 assert.equal((await call(a,`/admin/verifications/${r.id}/decision`,'POST',{expected_version:1,action:'approve',reason:'checked'})).status,400);
 const revision=(await call(a,`/admin/verifications/${r.id}/decision`,'POST',{expected_version:1,action:'request_evidence',reason:'Need a clearer photo'})).body;assert.equal(revision.state,'awaiting_evidence');
 const again=(await call(u,`/partners/${p}/verification`,'POST',{...input,previous_request_id:r.id,expected_version:2})).body;
 const approved=await call(a,`/admin/verifications/${again.id}/decision`,'POST',{expected_version:1,action:'approve',reason:'DEMO checked',checked:true});assert.equal(approved.body.state,'approved',JSON.stringify(approved));contract('AdminVerification',approved.body);
 assert.equal((await f.pool.query('SELECT verification_status FROM partners WHERE id=$1',[p])).rows[0].verification_status,'verified');
 assert.equal((await call(u,`/partners/${p}/verification`)).body.items.length,2);
 const snapshots=JSON.stringify((await f.pool.query('SELECT response_snapshot FROM idempotency_keys')).rows);assert.ok(!snapshots.includes(input.details.statement));
 const stored=(await f.pool.query('SELECT private_cipher FROM verification_requests')).rows;assert.ok(!JSON.stringify(stored).includes(input.details.statement));
 const url=(await call(u,`/assets/${asset}`)).body.download_url;assert.equal((await fetch(url)).status,200);assert.equal((await call(other,`/assets/${asset}`)).status,404);
 assert.equal((await fetch(f.base+`/assets/${asset}/admin-content`,{headers:{Authorization:'Bearer '+a.token,'X-Admin-Session':a.mfa!}})).status,200);
 const config=f.app.get((await import('../../src/modules/assets/assets.service.js')).AssetsService) as unknown as {config:{directory:string}};
 const object=(await f.pool.query('SELECT object_key FROM assets WHERE id=$1',[asset])).rows[0].object_key;const bytes=await readFile(config.config.directory+'/'+object+'.png');assert.notEqual(bytes.subarray(1,4).toString(),'PNG');
 await f.pool.query('UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1',[a.id]);assert.equal((await fetch(f.base+`/assets/${asset}/admin-content`,{headers:{Authorization:'Bearer '+a.token,'X-Admin-Session':a.mfa!}})).status,403);
});
test('review moderation keeps author removal, original stars and replies, serializes reviewers and records keep/hide/unhide',async()=>{
 const u=await user(),p=await partner(u),customer=await user(),a=await enroll(await user(['moderation.manage','audit.read'])),b=await enroll(await user(['moderation.manage']));
 const j=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'at_customer','{}',ST_GeogFromText('SRID=4326;POINT(105.8 21)'), 'now') RETURNING id",[customer.id,p])).rows[0].id;
 const id=(await f.pool.query("INSERT INTO reviews(job_id,direction,author_id,stars,body) VALUES($1,'customer_to_partner',$2,4,'DEMO review') RETURNING id",[j,customer.id])).rows[0].id;
 const race=await Promise.all([call(a,`/admin/reviews/${id}/decision`,'POST',{expected_version:1,action:'hide',reason:'DEMO review checked'}),call(b,`/admin/reviews/${id}/decision`,'POST',{expected_version:1,action:'keep',reason:'DEMO review checked'})]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
 await f.pool.query('UPDATE reviews SET removed_at=now() WHERE id=$1',[id]);
 const kept=(await call(a,`/admin/reviews/${id}/decision`,'POST',{expected_version:2,action:'keep',reason:'No change'})).body;assert.equal(kept.stars,4);assert.equal(kept.removed,true);
 const restored=(await call(a,`/admin/reviews/${id}/decision`,'POST',{expected_version:3,action:'unhide',reason:'Restore admin visibility'})).body;contract('AdminReview',restored);assert.equal(restored.hidden,false);assert.equal(restored.removed,true);assert.equal(restored.body,'DEMO review');assert.equal(restored.history.length,3);
 assert.equal((await call(a,'/admin/reviews?state=removed')).body.items.length,1);assert.equal((await call(a,`/admin/reviews/${randomUUID()}`)).status,404);
 const out=await call(a,'/admin/moderation-audit?limit=1');assert.ok(out.body.next_cursor);assert.equal((await call(b,'/admin/moderation-audit?cursor='+encodeURIComponent(out.body.next_cursor))).status,403);
 assert.equal((await f.pool.query('SELECT count(*) FROM settlements')).rows[0].count,'0');
});
