import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from '../helpers/database.js';
import {totp,decode32} from '../../src/modules/admin-auth/totp.js';
let f:Awaited<ReturnType<typeof databaseFixture>>;
const password='DEMO backoffice password 2026';
type User={token:string;id:string;mfa?:string};
async function call(u:User|undefined,path:string,method='GET',data?:unknown,key=randomUUID()){
 const r=await fetch(f.base+path,{method,headers:{'Content-Type':'application/json','Idempotency-Key':key,...(u?{Authorization:'Bearer '+u.token}:{}),...(u?.mfa?{'X-Admin-Session':u.mfa}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,body:await r.json()};
}
async function user(permissions:string[]=[]):Promise<User>{const r=await call(undefined,'/auth/register','POST',{email:randomUUID()+'@example.test',password,display_name:'DEMO operator'});assert.equal(r.status,201);const u={token:r.body.access_token,id:r.body.user.id};for(const p of permissions)await f.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[u.id,p]);return u;}
async function enroll(u:User){const s=await call(u,'/admin/auth/enrollment','POST',{password});assert.equal(s.status,201);const r=await call(u,'/admin/auth/enrollment/confirm','POST',{password,code:totp(decode32(s.body.secret),Math.floor(Date.now()/30000))});assert.equal(r.status,201);return {...u,mfa:r.body.token} as User;}
beforeEach(async()=>{f=await databaseFixture('backoffice-auth-'.repeat(4),false,undefined,false,{secret:'backoffice-private-'.repeat(4)});});
afterEach(async()=>{await f.close();});
test('admin grants enforce MFA self boundary least privilege concurrency and replay authorization',async()=>{
 const a=await enroll(await user(['grant.manage','reports.read'])),b=await enroll(await user(['grant.manage','reports.read'])),target=await user();
 const row=await call(a,'/admin/users/'+target.id+'/grants');assert.equal(row.status,200);
 const input={expected_version:row.body.version,permissions:['reports.read'],reason:'DEMO delegate'},key=randomUUID();
 assert.equal((await call({...a,mfa:undefined},'/admin/users/'+target.id+'/grants','POST',input)).status,403);
 assert.equal((await call(a,'/admin/users/'+a.id+'/grants','POST',input)).status,403);
 assert.equal((await call(a,'/admin/users/'+target.id+'/grants','POST',{...input,permissions:['finance.review']})).status,403);
 const raced=await Promise.all([call(a,'/admin/users/'+target.id+'/grants','POST',input,key),call(b,'/admin/users/'+target.id+'/grants','POST',{...input,permissions:[]})]);
 assert.deepEqual(raced.map(r=>r.status).sort(),[201,409]);
 if(raced[0].status===201)assert.deepEqual((await call(a,'/admin/users/'+target.id+'/grants','POST',input,key)).body,raced[0].body);
 await f.pool.query('UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1',[a.id]);
 assert.equal((await call(a,'/admin/users/'+target.id+'/grants','POST',input,key)).status,403);
 assert.equal((await call(b,'/admin/users/'+b.id+'/grants','POST',{expected_version:1,permissions:[],reason:'last'})).status,403);
 assert.equal((await f.pool.query("SELECT count(*) FROM admin_grants g JOIN users u ON u.id=g.user_id WHERE permission='grant.manage' AND revoked_at IS NULL AND u.status='active'")).rows[0].count,'1');
 await assert.rejects(f.pool.query("DELETE FROM audit_events WHERE action='admin.grants.change'"));
});
test('admin metrics and lookup use separate read permissions and do not mutate money',async()=>{
 const reader=await enroll(await user(['reports.read'])),finance=await enroll(await user(['finance.read'])),ordinary=await user();
 assert.equal((await call(ordinary,'/admin/metrics?from=2026-01-01T00:00:00Z&to=2100-01-01T00:00:00Z')).status,403);
 assert.equal((await call(finance,'/admin/metrics?from=2026-01-01T00:00:00Z&to=2100-01-01T00:00:00Z')).status,403);
 const m=await call(reader,'/admin/metrics?from=2026-01-01T00:00:00Z&to=2100-01-01T00:00:00Z');assert.equal(m.status,200);assert.ok(m.body.items.some((r:{name:string;value:unknown})=>r.name==='fee_settled'&&r.value==='0'));
 assert.equal((await call(reader,'/admin/invoices')).status,403);
 const p=await call(finance,'/admin/invoices');assert.equal(p.status,200);assert.deepEqual(p.body,{items:[],next_cursor:null});
 assert.equal((await f.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count,'0');
 await f.pool.query("UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1",[reader.id]);
 assert.equal((await call(reader,'/admin/metrics?from=2026-01-01T00:00:00Z&to=2100-01-01T00:00:00Z')).status,403);
});
test('lost response lookup never exposes response snapshots or another actor operation',async()=>{
 const a=await user(),b=await user(),key=randomUUID();
 const edit=await call(a,'/me','PATCH',{expected_version:1,display_name:'DEMO changed'},key);assert.equal(edit.status,200);
 const result=await call(a,'/operations/'+key);assert.equal(result.status,200);assert.equal(result.body.operation,'editMe');assert.equal(result.body.state,'completed');assert.equal(result.body.response_snapshot,undefined);assert.equal(result.body.display_name,undefined);
 assert.equal((await call(b,'/operations/'+key)).status,404);
 await f.pool.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,'another',$2,'x','completed','{}')",[a.id,key]);
 assert.equal((await call(a,'/operations/'+key)).status,409);
 assert.equal((await call(a,'/operations/'+key+'?operation=editMe')).status,200);
});
test('metrics use a half-open period and admin invoice lookups preserve versions and isolate cursors',async()=>{
 const a=await enroll(await user(['reports.read','finance.read','grant.manage'])),customer=await user();const partner=(await f.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO office') RETURNING id")).rows[0].id;
 const job=(await f.pool.query("INSERT INTO jobs(customer_id,partner_id,service_mode,address_snapshot,point,time_mode,created_at) VALUES($1,$2,'at_customer','{}',ST_GeogFromText('SRID=4326;POINT(105 21)'),'now','2026-10-10T00:00:00Z') RETURNING id",[customer.id,partner])).rows[0].id;
 const invoice=(await f.pool.query("INSERT INTO invoices(job_id) VALUES($1) RETURNING id",[job])).rows[0].id;const version=(await f.pool.query("INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials) VALUES($1,1,$2,9007199254740991,0) RETURNING id",[invoice,customer.id])).rows[0].id;await f.pool.query('UPDATE invoices SET current_version_id=$2 WHERE id=$1',[invoice,version]);
 const period='/admin/metrics?from=2026-10-01T00:00:00Z&to=2026-10-10T00:00:00Z';let m=await call(a,period);assert.equal(m.status,200);assert.equal(m.body.items.find((x:{name:string})=>x.name==='jobs_requested').value,'0');m=await call(a,period.replace('to=2026-10-10','to=2026-10-11'));assert.equal(m.body.items.find((x:{name:string})=>x.name==='jobs_requested').value,'1');
 assert.equal((await call(a,'/admin/metrics?from=bad&to=bad')).status,400);
 const details=await call(a,'/admin/invoices/'+invoice);assert.equal(details.status,200);assert.equal(details.body.labor,'9007199254740991');assert.equal(details.body.version,1);assert.equal((await call(a,'/admin/jobs/'+job)).body.customer_id,customer.id);
 assert.equal((await call(a,'/admin/invoices?state=unknown')).status,400);const p=await call(a,'/admin/grant-users?limit=1');assert.ok(p.body.next_cursor);assert.equal((await call(a,'/admin/jobs?cursor='+encodeURIComponent(p.body.next_cursor))).status,400); // signed cursor remains scoped to directory
});

test('global audit requires live MFA grant and binds pagination to actor and resource without exposing details',async()=>{
 const a=await enroll(await user(['audit.read'])),b=await enroll(await user(['audit.read'])),ordinary=await user(),resource=randomUUID();
 for(let n=0;n<3;n++)await f.pool.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details,created_at) VALUES($1,'partner.availability',$2,'DEMO audit',$3,'2026-01-01T00:00:00Z')",[ordinary.id,resource,JSON.stringify({token:'PRIVATE',evidence:'PRIVATE'})]);
 const url='/admin/audit?resource_id='+resource+'&limit=1';
 assert.equal((await call(ordinary,url)).status,403);assert.equal((await call({...a,mfa:undefined},url)).status,403);
 const first=await call(a,url);assert.equal(first.status,200);assert.equal(first.body.items.length,1);assert.ok(first.body.next_cursor);
 const row=first.body.items[0];assert.deepEqual(Object.keys(row).sort(),['action','actor_id','created_at','id','reason','resource_id','resource_type']);assert.equal(row.resource_type,'partner');assert.ok(!JSON.stringify(first.body).includes('PRIVATE'));
 const cursor=encodeURIComponent(first.body.next_cursor),second=await call(a,url+'&cursor='+cursor);assert.equal(second.status,200);assert.notEqual(second.body.items[0].id,row.id);
 assert.equal((await call(b,url+'&cursor='+cursor)).status,400);assert.equal((await call(a,'/admin/audit?cursor='+cursor)).status,400);
 assert.equal((await call(a,'/admin/audit?resource_id=bad')).status,400);assert.equal((await call(a,'/admin/audit?limit=101')).status,400);
 await f.pool.query("UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1",[a.id]);assert.equal((await call(a,url+'&cursor='+cursor)).status,403);
});
