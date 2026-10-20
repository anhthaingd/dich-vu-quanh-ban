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
beforeEach(async()=>{f=await databaseFixture('admin-test-auth-secret-'.repeat(3),true,undefined,true,{secret:'admin-test-private-secret-'.repeat(3)});});
afterEach(async()=>{await f.close();});
test('account administration revokes app and socket access while isolated support can only access own reports and evidence',async()=>{
 const a=await enroll(await user(['accounts.manage','support.read','support.manage'])),u=await user(),other=await user();
 const before=(await call(u,'/reports','POST',{kind:'account',subject:'Before lock',body:'Help'})).body;
 const priorKey=randomUUID(),priorInput={kind:'service',subject:'DEMO prior service',body:'Help'};
 assert.equal((await call(u,'/reports','POST',priorInput,priorKey)).status,201);
 const privatePhoto=await photo(u,'evidence'),foreignPhoto=await photo(other,'evidence');
 const {io}=await import('socket.io-client');
 const socket=io(f.base.replace('/v1',''),{path:'/v1/realtime/socket.io',transports:['websocket'],auth:{token:u.token},reconnection:false});
 try{
  await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
  const disconnected=new Promise<void>(resolve=>socket.once('disconnect',()=>resolve()));
  const row=(await call(a,'/admin/users/'+u.id)).body;
  const input={expected_version:row.version,action:'suspend_all',reason:'DEMO lock'},key=randomUUID();
  const locked=await call(a,'/admin/users/'+u.id+'/decision','POST',input,key);assert.equal(locked.status,201,JSON.stringify(locked));
  await disconnected;assert.equal(socket.connected,false);
  assert.deepEqual((await call(a,'/admin/users/'+u.id+'/decision','POST',input,key)).body,locked.body);
  assert.equal((await call(u,'/me')).status,401);assert.equal((await call(u,'/reports')).status,401);
  const email=(await f.pool.query("SELECT subject FROM identities WHERE user_id=$1 AND provider='email'",[u.id])).rows[0].subject;
  const login=await call(undefined,'/auth/login','POST',{email,password});assert.equal(login.status,200);assert.equal(login.body.user.status,'suspended');assert.deepEqual(login.body.user.admin_permissions,[]);
  const restricted={...u,token:login.body.access_token};
  for(const path of ['/jobs','/me/sessions','/conversations','/admin/auth/status'])assert.equal((await call(restricted,path)).status,401,path);
  assert.equal((await call(restricted,'/reports','POST',priorInput,priorKey)).status,400);
  assert.equal((await call(restricted,'/assets/'+foreignPhoto)).status,404);
  assert.equal((await call(restricted,'/me')).status,200);assert.equal((await call(restricted,'/reports/'+before.id)).status,200);
  assert.equal((await call(other,'/reports/'+before.id)).status,404);
  assert.equal((await call(restricted,'/reports','POST',{kind:'service',subject:'No',body:'No',job_id:randomUUID()})).status,400);
  assert.equal((await call(restricted,'/assets/upload-grants','POST',{purpose:'result',mime:'image/png',bytes:8})).status,404);
  const evidence=await photo(restricted,'evidence');
  const report=await call(restricted,'/reports','POST',{kind:'account',subject:'Appeal',body:'DEMO help',evidence_ids:[evidence,privatePhoto]});assert.equal(report.status,201);
  assert.equal((await call(a,'/admin/reports/'+report.body.id+'/decision','POST',{expected_version:1,state:'awaiting_evidence',reason:'DEMO reply'})).status,201);
  assert.equal((await call(restricted,'/reports/'+report.body.id+'/updates','POST',{body:'DEMO supplement'})).body.state,'reviewing');
  const refresh=await call(undefined,'/auth/refresh','POST',{refresh_token:login.body.refresh_token});assert.equal(refresh.status,200);restricted.token=refresh.body.access_token;assert.equal((await call(restricted,'/jobs')).status,401);
  const restored=await call(a,'/admin/users/'+u.id+'/decision','POST',{expected_version:locked.body.version,action:'restore',reason:'DEMO restore'});assert.equal(restored.status,201);
  assert.equal((await call(restricted,'/me')).status,401);
  assert.equal((await call(undefined,'/auth/login','POST',{email,password})).body.user.status,'active');
  assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');
 }finally{socket.disconnect();}
});
test('admin directories enforce permission MFA cursor scope CAS retry and immutable decision history',async()=>{
 const a=await enroll(await user(['accounts.manage','audit.read'])),b=await enroll(await user(['accounts.manage'])),u=await user(),outsider=await user();
 assert.equal((await call(outsider,'/admin/users')).status,403);
 assert.equal((await call({...a,mfa:undefined},'/admin/users')).status,403);
 assert.equal((await call(a,'/admin/partners')).status,403);
 const page=await call(a,'/admin/users?limit=1');assert.ok(page.body.next_cursor);
 assert.equal((await call(a,'/admin/users?state=suspended&cursor='+encodeURIComponent(page.body.next_cursor))).status,400);
 const r=(await call(a,'/admin/users/'+u.id)).body;
 assert.ok(r.contacts[0].value.includes('***'));
 const results=await Promise.all([a,b].map(admin=>call(admin,'/admin/users/'+u.id+'/decision','POST',{expected_version:r.version,action:'suspend_all',reason:'DEMO concurrency'})));
 assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 assert.equal((await call(a,'/admin/users/'+a.id+'/decision','POST',{expected_version:1,action:'suspend_all',reason:'self'})).status,403);
 assert.equal((await call(a,'/admin/users/'+b.id+'/decision','POST',{expected_version:1,action:'suspend_all',reason:'admin'})).status,403);
 await f.pool.query("UPDATE admin_sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",[a.id]);
 assert.equal((await call(a,'/admin/users/'+u.id+'/decision','POST',{expected_version:2,action:'restore',reason:'expired'})).status,403);
 await assert.rejects(f.pool.query("DELETE FROM moderation_history WHERE domain='users'"));
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1",[a.id]);
 assert.equal((await call(a,'/admin/users/'+u.id)).status,403);
});
test('partner warning suspension and restore retain existing work and money while preventing new availability',async()=>{
 const a=await enroll(await user(['moderation.manage'])),u=await user(),p=await partner(u);
 const customer=await user();
 const job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer','{}',ST_GeogFromText('SRID=4326;POINT(105.8 21)'),'now') RETURNING *",[customer.id,p])).rows[0];
 const warn=await call(a,'/admin/partners/'+p+'/decision','POST',{expected_version:1,action:'warn',reason:'DEMO warning'});assert.equal(warn.status,201);assert.equal(warn.body.state,'active');
 const stop=await call(a,'/admin/partners/'+p+'/decision','POST',{expected_version:2,action:'suspend_new',reason:'DEMO suspension'});assert.equal(stop.body.state,'new_work_suspended');assert.equal(stop.body.accepting_jobs,false);
 assert.equal((await call(u,'/partners/'+p+'/availability','PUT',{expected_version:3,accepting_jobs:true})).status,403);
 const restore=await call(a,'/admin/partners/'+p+'/decision','POST',{expected_version:3,action:'restore',reason:'DEMO restore'});assert.equal(restore.body.state,'active');assert.equal(restore.body.accepting_jobs,false);
 assert.equal(restore.body.history.length,3);assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');
 assert.deepEqual((await f.pool.query('SELECT * FROM jobs WHERE id=$1',[job.id])).rows[0],job);
 assert.equal((await call(u,'/jobs/'+job.id)).status,200);
});
test('admin catalog creates a stable tree and stops new selection without changing historical job snapshots',async()=>{
 const a=await enroll(await user(['catalog.manage','audit.read'])),other=await enroll(await user(['support.read']));
 assert.equal((await call(other,'/admin/categories')).status,403);
 const create=async(d:string,data:unknown)=>{const r=await call(a,'/admin/'+d,'POST',data);assert.equal(r.status,201,JSON.stringify(r));return r.body;};
 const industry=await create('categories',{active:true,code:'demo_industry',name_vi:'DEMO Industry',reason:'DEMO create'});
 const group=await create('categories',{active:true,code:'demo_group',name_vi:'DEMO Group',parent_id:industry.id,reason:'DEMO create'});
 const skill=await create('skills',{active:true,code:'demo_skill',name_vi:'DEMO Skill',category_ids:[group.id],reason:'DEMO create'});
 const owner=await user(),provider=await partner(owner),customer=await user();
 const job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'at_customer','{}',ST_GeogFromText('SRID=4326;POINT(105.8 21)'),'now') RETURNING id",[customer.id,provider])).rows[0].id;
 await f.pool.query("INSERT INTO job_skills(job_id,skill_id,name_snapshot,schema_version) VALUES($1,$2,'DEMO Skill',1)",[job,skill.id]);
 assert.equal((await call(a,'/admin/categories','POST',{active:true,code:'bad_depth',name_vi:'Bad',parent_id:group.id,reason:'Bad'})).status,400);
 assert.equal((await call(a,'/admin/skills','POST',{active:true,code:'bad_parent',name_vi:'Bad',category_ids:[industry.id],reason:'Bad'})).status,400);
 assert.equal((await call(a,'/admin/categories','POST',{code:'bad_version',name_vi:'DEMO invalid',expected_version:1,reason:'DEMO'})).status,400);
 assert.equal((await call(a,'/admin/categories/'+industry.id,'PUT',{expected_version:1,name_vi:'DEMO invalid',reason:'DEMO missing state'})).status,400);
 const input={expected_version:1,name_vi:'DEMO Renamed',active:false,reason:'DEMO stop'},key=randomUUID();
 const stop=await call(a,'/admin/categories/'+industry.id,'PUT',input,key);assert.equal(stop.status,200,JSON.stringify(stop));
 assert.deepEqual((await call(a,'/admin/categories/'+industry.id,'PUT',input,key)).body,stop.body);
 assert.equal((await call(a,'/admin/categories/'+industry.id,'PUT',input)).status,409);
 assert.equal((await call(a,'/admin/categories/'+industry.id,'PUT',{...input,expected_version:2,code:'changed'})).status,400);
 assert.equal((await call(undefined,'/skills?category_id='+industry.id)).body.items.length,0);
 assert.equal((await call(a,'/admin/skills/'+skill.id)).body.code,'demo_skill');
 assert.equal((await call(a,'/admin/categories?state=inactive&q=DEMO')).body.items[0].id,industry.id);
 const restored=await call(a,'/admin/categories/'+industry.id,'PUT',{...input,expected_version:2,active:true});assert.equal(restored.status,200);
 const visible=await call(undefined,'/skills?category_id='+industry.id);assert.equal(visible.body.items[0].id,skill.id);
 const oldSchema=(await f.pool.query('SELECT schema_version FROM skills WHERE id=$1',[skill.id])).rows[0].schema_version;
 assert.equal((await call(a,'/admin/skills/'+skill.id,'PUT',{expected_version:1,name_vi:'DEMO new name',active:false,reason:'DEMO rename'})).status,200);
 assert.equal((await f.pool.query('SELECT schema_version FROM skills WHERE id=$1',[skill.id])).rows[0].schema_version,oldSchema);
 assert.equal((await f.pool.query('SELECT name_snapshot FROM job_skills WHERE job_id=$1',[job])).rows[0].name_snapshot,'DEMO Skill');
 contract('AdminOperationItem',(await call(a,'/admin/skills/'+skill.id)).body);
 assert.equal((await call(a,'/admin/skills','POST',{active:true,code:'duplicate_name',name_vi:'DEMO new name',category_ids:[group.id],reason:'DEMO duplicate'})).status,409);
});
