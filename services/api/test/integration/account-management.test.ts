import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { databaseFixture } from '../helpers/database.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
const secret = 'account-management-test-'.repeat(3);
const body = { label: 'Home', address: { text: 'PRIVATE_ADDRESS_CANARY', point: { latitude: 10.77, longitude: 106.7 } }, is_default: false };
function request(base: string, token: string, path: string, method='GET', input?: unknown, key: string=randomUUID()) {
  return fetch(base+path, { method, headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key, ...(input === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
}
test('address CRUD is owner-only, default switches atomically, retry and archive cannot duplicate or restore', async () => {
  const f=await databaseFixture(secret);
  try {
    const auth=f.app.get(AuthService), a=await auth.register('a@example.test','test-only-long-password','A'), b=await auth.register('b@example.test','test-only-long-password','B');
    const call=(path: string,method='GET',input?: unknown,key?: string)=>request(f.base,a.access_token,path,method,input,key);
    const key=randomUUID(); const [one,two]=await Promise.all([call('/me/addresses','POST',body,key),call('/me/addresses','POST',body,key)]);
    assert.equal(one.status,201); const first=await one.json(); assert.deepEqual(await two.json(),first); assert.equal(first.is_default,true); assert.equal(first.version,1);
    const second=await (await call('/me/addresses','POST',{...body,label:'Work',is_default:true})).json();
    const list=await (await call('/me/addresses')).json(); assert.equal(list.items.length,2); assert.equal(list.items.filter((x: {is_default:boolean})=>x.is_default).length,1);
    assert.equal(list.items.find((x:{id:string})=>x.id===first.id).version,2);
    assert.equal((await call(`/me/addresses/${first.id}`,'PUT',{...body,expected_version:1})).status,409);
    assert.equal((await request(f.base,b.access_token,`/me/addresses/${first.id}`,'PUT',{...body,expected_version:2})).status,404);
    assert.equal((await request(f.base,b.access_token,`/me/addresses/${first.id}/archive`,'POST')).status,404);
    assert.deepEqual((await (await request(f.base,b.access_token,'/me/addresses')).json()).items,[]);
    const edits=await Promise.all(['One','Two'].map(label=>call(`/me/addresses/${first.id}`,'PUT',{...body,label,is_default:true,expected_version:2})));
    assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
    const k=randomUUID();const archived=await (await call(`/me/addresses/${first.id}/archive`,'POST',undefined,k)).json();
    assert.deepEqual(await (await call(`/me/addresses/${first.id}/archive`,'POST',undefined,k)).json(),archived);
    assert.equal((await call(`/me/addresses/${second.id}/archive`,'POST',undefined,k)).status,409);
    assert.equal((await call(`/me/addresses/${first.id}`,'PUT',{...body,expected_version:archived.version})).status,404);
    const remaining=await (await call('/me/addresses')).json(); assert.equal(remaining.items.length,1); assert.equal(remaining.items[0].is_default,false);
    assert.equal((await call('/me/addresses','POST',body,key)).status,201); // replay original result; cannot unarchive
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM saved_addresses')).rows[0].n,2);
    assert.ok(!f.logs.text().includes(body.address.text)); assert.ok(!f.logs.text().includes(a.access_token));
  } finally { await f.close(); }
});
test('address page cursor is signed, actor/endpoint-scoped and contains no address; invalid fields rejected', async()=>{
  const f=await databaseFixture(secret);
  try {
    const auth=f.app.get(AuthService), a=await auth.register('a@example.test','test-only-long-password','A'), b=await auth.register('b@example.test','test-only-long-password','B');
    const call=(path:string,method='GET',input?:unknown,key?:string)=>request(f.base,a.access_token,path,method,input,key);
    for(let i=0;i<3;i++) assert.equal((await call('/me/addresses','POST',{...body,label:String(i)})).status,201);
    const page=await (await call('/me/addresses?limit=1')).json();
    const decoded=JSON.parse(Buffer.from(page.next_cursor.split('.')[0],'base64url').toString()); assert.deepEqual(Object.keys(decoded).sort(),['created_at','id','scope']);
    const next=await (await call('/me/addresses?limit=2&cursor='+encodeURIComponent(page.next_cursor))).json(); assert.equal(next.items.length,2); assert.equal(next.next_cursor,null); assert.ok(!next.items.some((x:{id:string})=>x.id===page.items[0].id));
    for(const path of ['/me/sessions?cursor='+page.next_cursor,'/me/addresses?limit=0','/me/addresses?limit=1&limit=2','/me/addresses?owner='+a.user.id,'/me/addresses?cursor=bad']) assert.equal((await call(path)).status,400);
    assert.equal((await request(f.base,b.access_token,'/me/addresses?cursor='+page.next_cursor)).status,400);
    for(const invalid of [null,[],{...body,user_id:b.user.id},{...body,label:' '},{...body,is_default:'true'},{...body,expected_version:1},{...body,address:{text:'x',point:{latitude:91,longitude:0}}},{...body,address:{text:'x',point:{latitude:0,longitude:181}}}]) assert.equal((await call('/me/addresses','POST',invalid)).status,400);
    assert.equal((await call('/me/addresses','POST',body,'bad')).status,400);
    await f.pool.query('UPDATE sessions SET revoked_at=now()'); assert.equal((await call('/me/addresses')).status,401);
  } finally { await f.close(); }
});
test('failed key write rolls back address and default switch',async()=>{
  const f=await databaseFixture(secret);
  try {
    const a=await f.app.get(AuthService).register('a@example.test','test-only-long-password','A');
    await request(f.base,a.access_token,'/me/addresses','POST',body);
    await f.pool.query("ALTER TABLE idempotency_keys ADD CONSTRAINT fail_test CHECK(operation<>'addAddress') NOT VALID");
    const key=randomUUID();assert.equal((await request(f.base,a.access_token,'/me/addresses','POST',{...body,is_default:true},key)).status,500);
    const rows=(await f.pool.query('SELECT is_default,version FROM saved_addresses')).rows;assert.deepEqual(rows,[{is_default:true,version:1}]);
    await f.pool.query('ALTER TABLE idempotency_keys DROP CONSTRAINT fail_test');assert.equal((await request(f.base,a.access_token,'/me/addresses','POST',{...body,is_default:true},key)).status,201);
  } finally { await f.close(); }
});
test('sessions group rotations, revoke entire login family including racing refresh, hide other accounts and secrets',async()=>{
  const f=await databaseFixture(secret);
  try {
    const auth=f.app.get(AuthService), a=await auth.register('a@example.test','test-only-long-password','A'), other=await auth.login('a@example.test','test-only-long-password'), b=await auth.register('b@example.test','test-only-long-password','B');
    const rotated=await auth.refresh(other.refresh_token);
    const page=await (await request(f.base,a.access_token,'/me/sessions')).json();assert.equal(page.items.length,2);assert.equal(page.items.filter((x:{is_current:boolean})=>x.is_current).length,1);
    assert.ok(!JSON.stringify(page).includes('refresh'));assert.ok(!JSON.stringify(page).includes('access_token'));
    const target=page.items.find((x:{is_current:boolean})=>!x.is_current);
    assert.equal((await request(f.base,b.access_token,`/me/sessions/${target.id}/revoke`,'POST')).status,404);
    const key=randomUUID();const [revoke,refresh]=await Promise.all([request(f.base,a.access_token,`/me/sessions/${target.id}/revoke`,'POST',undefined,key),auth.refresh(rotated.refresh_token).catch(()=>null)]);
    assert.equal(revoke.status,201);assert.equal((await request(f.base,a.access_token,`/me/sessions/${target.id}/revoke`,'POST',undefined,key)).status,201);
    if(refresh) await assert.rejects(()=>auth.authenticate('Bearer '+refresh.access_token));
    await assert.rejects(()=>auth.refresh(rotated.refresh_token));
    const current=page.items.find((x:{is_current:boolean})=>x.is_current);
    assert.equal((await request(f.base,a.access_token,`/me/sessions/${current.id}/revoke`,'POST',undefined,key)).status,409);
    assert.equal((await request(f.base,a.access_token,`/me/sessions/${current.id}/revoke`,'POST')).status,201);
    assert.equal((await request(f.base,a.access_token,'/me')).status,401);await assert.rejects(()=>auth.refresh(a.refresh_token));
    assert.ok(!f.logs.text().includes(rotated.refresh_token));
  } finally { await f.close(); }
});
test('management responses match approved schemas and session pagination is stable through rotation',async()=>{
  const f=await databaseFixture(secret);
  try {
    const {readFile}=await import('node:fs/promises'),{Ajv2020}=await import('ajv/dist/2020.js'),{default:formats}=await import('ajv-formats');
    const spec=JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8'));
    const ajv=new Ajv2020({strict:false});(formats as unknown as (x:typeof ajv)=>void)(ajv);
    const matches=(name:string,body:unknown)=>{const valid=ajv.compile({...spec.components.schemas[name],components:spec.components});assert.ok(valid(body),JSON.stringify(valid.errors));};
    const auth=f.app.get(AuthService),a=await auth.register('a@example.test','test-only-long-password','A');
    const extra=await auth.login('a@example.test','test-only-long-password');await auth.login('a@example.test','test-only-long-password');
    const page=await (await request(f.base,a.access_token,'/me/sessions?limit=1')).json();matches('listSessionsPage',page);await auth.refresh(extra.refresh_token);
    const next=await (await request(f.base,a.access_token,'/me/sessions?cursor='+page.next_cursor)).json();matches('listSessionsPage',next);assert.equal(next.items.length,2);assert.equal(next.next_cursor,null);
    await f.pool.query('UPDATE sessions SET expires_at=now()-interval \'1 second\' WHERE family_id=$1',[next.items[1].id]);
    const expired=await (await request(f.base,a.access_token,'/me/sessions')).json();assert.equal(expired.items.find((x:{id:string})=>x.id===next.items[1].id).state,'expired');
    const r=await request(f.base,a.access_token,'/me/addresses','POST',body);assert.equal(r.headers.get('cache-control'),'no-store');const address=await r.json();matches('SavedAddress',address);
    matches('SavedAddress',await (await request(f.base,a.access_token,'/me/addresses/'+address.id,'PUT',{...body,expected_version:1})).json());
    matches('listAddressesPage',await (await request(f.base,a.access_token,'/me/addresses')).json());
    matches('Ack',await (await request(f.base,a.access_token,'/me/addresses/'+address.id+'/archive','POST')).json());
    assert.equal((await request(f.base,a.access_token,'/me/sessions/bad/revoke','POST')).status,400);
    assert.equal((await request(f.base,a.access_token,'/me/sessions/'+next.items[0].id+'/revoke','POST',{user_id:a.user.id})).status,400);
    const preflight=await fetch(f.base+'/me/addresses/'+address.id,{method:'OPTIONS',headers:{Origin:'http://localhost','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,idempotency-key,content-type'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-methods')!,/PUT/);
  } finally {await f.close();}
});
