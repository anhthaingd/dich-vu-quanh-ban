import {test} from 'node:test';import assert from 'node:assert/strict';
import 'tsx/esm';
const {AdminClient,isItem}=await import('../../apps/admin/src/client.ts');
test('admin client keeps retry payload and token scope, clears rejected sessions and rejects malformed pages',async()=>{
 const requests=[];const transport=async(url,init)=>{requests.push({url:String(url),init});return new globalThis.Response(JSON.stringify({items:[{id:'bad',version:1}],next_cursor:null}),{status:200});};
 const c=new AdminClient('http://localhost/v1',transport);await assert.rejects(c.page('reports',''),/INVALID_RESPONSE/);assert.equal(isItem({id:'x',version:1,history:[]}),false);
 c.session={access_token:'a',refresh_token:'r',expires_at:'later',user:{id:'u',admin_permissions:['support.read']}};c.mfa={token:'m',expires_at:'later',fresh_until:'soon'};
 await assert.rejects(c.decision('reports','id',{expected_version:1,state:'closed',reason:'test'},'stable'),/INVALID_RESPONSE/);await assert.rejects(c.decision('reports','id',{expected_version:1,state:'closed',reason:'test'},'stable'));
 assert.deepEqual(requests[1],requests[2]);assert.equal(requests[1].init.headers['X-Admin-Session'],'m');c.clear();assert.equal(c.session,null);assert.equal(c.mfa,null);
});
test('admin refresh retries an uncertain request with unchanged key and MFA, and unauthorized refresh clears credentials',async()=>{
 const requests=[],session={access_token:'new-access',refresh_token:'new-refresh',expires_at:'2026-10-19T03:00:00Z',user:{id:'admin',admin_permissions:['support.read']}};
 const answers=[{status:401,body:{}},{status:200,body:session},{status:200,body:{ok:true}},{status:401,body:{}},{status:401,body:{}}];
 const client=new AdminClient('http://localhost/v1',async(url,init)=>{requests.push({url,init});const r=answers.shift();return new globalThis.Response(JSON.stringify(r.body),{status:r.status});});
 client.session={...session,access_token:'old-access',refresh_token:'old-refresh'};client.mfa={token:'mfa',expires_at:session.expires_at,fresh_until:session.expires_at};
 const payload={expected_version:3,reason:'DEMO'};assert.deepEqual(await client.call('/admin/reports/id/decision','POST',payload,'same-key'),{ok:true});
 assert.equal(requests[0].init.body,requests[2].init.body);assert.equal(requests[0].init.headers['Idempotency-Key'],requests[2].init.headers['Idempotency-Key']);assert.equal(requests[2].init.headers['X-Admin-Session'],'mfa');assert.equal(requests[2].init.headers.Authorization,'Bearer new-access');
 await assert.rejects(client.call('/admin/reports'),/UNAUTHENTICATED/);assert.equal(client.session,null);assert.equal(client.mfa,null);
});
