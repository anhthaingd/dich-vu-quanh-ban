import {test} from 'node:test';import assert from 'node:assert/strict';
import 'tsx/esm';
const {AdminClient,ClientError,isItem}=await import('../../apps/admin/src/client.ts');
const {toErrorInfo,errorText,errorCategory,errorReference,referenceText,consolePanel,invalid}=await import('../../apps/admin/src/errors.ts');
const {reasonMessage}=await import('../../apps/mobile/src/lib/errors/reasons/index.ts');
const {categoryMessages}=await import('../../apps/mobile/src/lib/errors/categories.ts');
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
test('admin console keeps sign-in and admin session across reloads and tabs without replaying a spent refresh token (B00-33)',async()=>{
 let saved=null;const store={read:()=>saved&&JSON.parse(saved),write:v=>{saved=JSON.stringify(v);},clear:()=>{saved=null;}};
 // Server: each refresh token works once; any replay revokes the login.
 let current='r0',n=0,revoked=false;const user={id:'admin',admin_permissions:['support.read']};
 const transport=async(url,init)=>{const path=String(url).replace('http://localhost/v1','');const body=init.body?JSON.parse(init.body):{};
  if(path==='/auth/login'){return new globalThis.Response(JSON.stringify({access_token:'a0',refresh_token:current,expires_at:'2099-01-01T00:00:00Z',user}),{status:200});}
  if(path==='/auth/refresh'){if(revoked||body.refresh_token!==current){revoked=true;return new globalThis.Response('{}',{status:401});}current='r'+(++n);return new globalThis.Response(JSON.stringify({access_token:'a'+n,refresh_token:current,expires_at:'2099-01-01T00:00:00Z',user}),{status:200});}
  if(path==='/admin/auth/verify')return new globalThis.Response(JSON.stringify({token:'m',expires_at:'2099-01-01T00:00:00Z',fresh_until:'2099-01-01T00:00:00Z'}),{status:201});
  if(path==='/auth/logout')return new globalThis.Response('{}',{status:200});
  // Access tokens older than the newest rotation are rejected, as the server revokes the rotated session row.
  return new globalThis.Response('{"ok":true}',{status:init.headers.Authorization==='Bearer a'+n?200:401});};
 const a=new AdminClient('http://localhost/v1',transport,store);await a.login('admin@example.test','DEMO');await a.verify('DEMO','123456',false);
 const b=new AdminClient('http://localhost/v1',transport,store);assert.equal(b.session.refresh_token,'r0');assert.equal(b.mfa.token,'m');
 assert.deepEqual(await a.call('/admin/reports'),{ok:true});assert.deepEqual(await b.call('/admin/reports'),{ok:true});assert.deepEqual(await a.call('/admin/reports'),{ok:true});
 assert.equal(revoked,false);assert.equal(JSON.parse(saved).session.refresh_token,current);
 const expired=new AdminClient('http://localhost/v1',transport,{read:()=>({session:JSON.parse(saved).session,mfa:{token:'old',expires_at:'2000-01-01T00:00:00Z',fresh_until:'2000-01-01T00:00:00Z'}}),write(){},clear(){}});assert.equal(expired.mfa,null);
 await a.logout();assert.equal(saved,null);
});

const json=(status,body,headers={})=>new globalThis.Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
const signedIn=c=>{c.session={access_token:'a',refresh_token:'r',expires_at:'2099-01-01T00:00:00Z',user:{id:'u',admin_permissions:['catalog.manage']}};c.mfa={token:'m',expires_at:'2099-01-01T00:00:00Z',fresh_until:'2099-01-01T00:00:00Z'};return c;};
const failure=async promise=>{try{await promise;}catch(e){return e;}assert.fail('expected a failure');};
const header='11111111-2222-4333-8444-555555555555',correlation='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
test('admin client keeps the API reason, the named field and the request id; code semantics stay unchanged',async()=>{
 const body={code:'VALIDATION',reason:'ADMIN_CATALOG_NAME_REQUIRED',field_errors:[{field:'name_vi',code:'ADMIN_CATALOG_NAME_REQUIRED'}],message:'Bad request',correlation_id:correlation,retryable:false};
 let e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>json(400,body,{'x-request-id':header}))).saveCatalog('categories',null,{},'k'));
 assert.ok(e instanceof ClientError);assert.equal(e.code,'VALIDATION');assert.equal(e.reason,'ADMIN_CATALOG_NAME_REQUIRED');assert.equal(e.field,'name_vi');assert.equal(e.requestId,header);assert.equal(e.status,400);
 assert.deepEqual(toErrorInfo(e),{code:'VALIDATION',reason:'ADMIN_CATALOG_NAME_REQUIRED',field:'name_vi',requestId:header,status:400});
 // Without a readable header the body's correlation_id is the request id.
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>json(409,{code:'STATE_CONFLICT',reason:'ADMIN_CATALOG_CODE_TAKEN',correlation_id:correlation}))).saveCatalog('categories',null,{},'k'));
 assert.equal(e.code,'STATE_CONFLICT');assert.equal(e.reason,'ADMIN_CATALOG_CODE_TAKEN');assert.equal(e.requestId,correlation);assert.equal(e.field,undefined);
 // Malformed reason, field and ids are dropped, never shown.
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>json(400,{code:'VALIDATION',reason:'not a reason',field_errors:[{field:'Bad Field'}],correlation_id:'x<script>'},{'x-request-id':'not-a-uuid'}))).item('reports','id'));
 assert.deepEqual(toErrorInfo(e),{code:'VALIDATION',status:400});
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>json(400,{code:'VALIDATION',reason:'ADMIN_X',field_errors:'name'}))).item('reports','id'));
 assert.equal(e.reason,'ADMIN_X');assert.equal(e.field,undefined);
 // Bodies without a code keep the status fallbacks; 401 still clears the sign-in.
 const c=signedIn(new AdminClient('http://localhost/v1',async()=>json(401,{reason:'SESSION_REVOKED'})));e=await failure(c.call('/auth/refresh','POST',{}));
 assert.equal(e.code,'UNAUTHENTICATED');assert.equal(e.reason,'SESSION_REVOKED');assert.equal(c.session,null);
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>json(404,{}))).item('reports','id'));assert.equal(e.code,'FAILED');assert.equal(errorCategory(toErrorInfo(e)),'NOT_FOUND');
});
test('admin client distinguishes unreachable server, gateway pages, malformed success bodies and missing admin access',async()=>{
 let e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>{throw new TypeError('fetch failed');})).item('reports','id'));
 assert.deepEqual(toErrorInfo(e),{code:'NETWORK'});assert.equal(errorCategory(toErrorInfo(e)),'NETWORK');
 // An HTML error page keeps code NETWORK (writes stay retryable) but the message says what the status means.
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>new globalThis.Response('<html>Bad gateway</html>',{status:502,headers:{'x-request-id':header}}))).item('reports','id'));
 assert.equal(e.code,'NETWORK');assert.equal(e.status,502);assert.equal(errorCategory(toErrorInfo(e)),'SERVICE_UNAVAILABLE');assert.equal(errorReference(toErrorInfo(e)),'11111111');
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>new globalThis.Response('not json',{status:200}))).item('reports','id'));assert.equal(e.code,'INVALID_RESPONSE');
 e=await failure(new AdminClient('http://localhost/v1',async()=>json(200,{access_token:'a',refresh_token:'r',expires_at:'later',user:{id:'u',admin_permissions:[]}})).login('user@example.test','DEMO'));
 assert.equal(e.code,'FORBIDDEN');assert.equal(e.reason,'ADMIN_ACCESS_REQUIRED');assert.equal(errorText('vi',toErrorInfo(e)),reasonMessage('vi','ADMIN_ACCESS_REQUIRED'));
 // Evidence downloads keep FORBIDDEN/FAILED codes and now carry the reason.
 const c=signedIn(new AdminClient('http://localhost/v1',async()=>json(404,{code:'NOT_FOUND',reason:'ASSET_NOT_FOUND',correlation_id:correlation})));
 e=await failure(c.photo('asset'));assert.equal(e.code,'FAILED');assert.equal(e.reason,'ASSET_NOT_FOUND');assert.equal(e.status,404);
 e=await failure(signedIn(new AdminClient('http://localhost/v1',async()=>{throw new TypeError('offline');})).photo('asset'));assert.equal(e.code,'NETWORK');
});
test('console messages: API reason first, then panel context, then the category text, in the console locale',()=>{
 const panel=consolePanel(k=>'panel:'+k,true),info={code:'STATE_CONFLICT',reason:'ADMIN_CATALOG_CODE_TAKEN'};
 for(const locale of ['vi','en','ja'])assert.equal(errorText(locale,info,panel),reasonMessage(locale,'ADMIN_CATALOG_CODE_TAKEN'));
 assert.equal(errorText('fr',info),reasonMessage('vi','ADMIN_CATALOG_CODE_TAKEN'));
 // Unknown reason: the panel's conflict text, then the generic category text.
 assert.equal(errorText('en',{code:'STATE_CONFLICT',reason:'SOMETHING_NEW'},panel),'panel:conflict');
 assert.equal(errorText('en',{code:'STATE_CONFLICT',reason:'SOMETHING_NEW'}),categoryMessages.en.STATE_CONFLICT);
 // Infrastructure categories are never replaced by a vague panel sentence, except an unconfirmed pending write.
 assert.equal(errorText('vi',{code:'VALIDATION'},panel),categoryMessages.vi.VALIDATION);
 assert.equal(errorText('vi',{code:'INTERNAL'},panel),categoryMessages.vi.INTERNAL);
 assert.equal(errorText('vi',{code:'NETWORK'},panel),'panel:network');
 assert.equal(errorText('vi',{code:'NETWORK'},consolePanel(k=>'panel:'+k)),'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.');
 assert.equal(errorText('vi',{code:'NETWORK',timeout:true}),categoryMessages.vi.TIMEOUT);
 assert.equal(errorText('ja','SOMETHING_ODD'),categoryMessages.ja.HTTP);
 assert.equal(errorText('vi','FORBIDDEN',panel),'panel:forbidden');
 // References only for unexpected server failures.
 assert.equal(errorReference({code:'INTERNAL',requestId:correlation,status:500}),'AAAAAAAA');
 assert.equal(errorReference({code:'SERVICE_UNAVAILABLE',reason:'DATABASE_UNAVAILABLE',requestId:correlation,status:503}),'AAAAAAAA');
 assert.equal(errorReference({code:'VALIDATION',requestId:correlation,status:400}),undefined);
 assert.equal(errorReference({code:'INTERNAL'}),undefined);
 assert.equal(referenceText('vi','AAAAAAAA'),'Mã tra cứu: AAAAAAAA');assert.equal(referenceText('en','AAAAAAAA'),'Reference code: AAAAAAAA');
 // Field marker and hook-thrown shapes.
 assert.equal(invalid({code:'VALIDATION',field:'reason'},'reason','body'),true);assert.equal(invalid({code:'VALIDATION',field:'name_vi'},'reason'),undefined);assert.equal(invalid(null,'reason'),undefined);
 assert.deepEqual(toErrorInfo({code:'INVALID_RESPONSE'}),{code:'INVALID_RESPONSE'});assert.deepEqual(toErrorInfo(new Error('x')),{code:'NETWORK'});
});
