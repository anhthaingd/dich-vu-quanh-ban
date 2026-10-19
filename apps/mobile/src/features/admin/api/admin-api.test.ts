import {AdminApi} from './admin-api';
import {authFixture,session} from '../../../../test/helpers/auth';
import {ApiError} from '../../../lib/http/api-error';
const response=(value:unknown,status=200)=>({ok:status<400,status,json:async()=>value,headers:{get:()=>null}} as unknown as Response);
async function fixture(){const f=authFixture();const user={...session.user,admin_permissions:['support.read']};f.api.login.mockResolvedValue({...session,user});f.api.refresh.mockResolvedValue({...session,user,access_token:'rotated'});await f.manager.login({email:'admin@example.test',password:'DEMO password'});const transport=jest.fn<ReturnType<typeof fetch>,Parameters<typeof fetch>>();return {...f,transport,client:new AdminApi(f.manager,user.id,'http://localhost:3100/v1',transport)};}
const mfa={token:'DEMO-mfa',expires_at:'2099-01-01T00:00:00Z',fresh_until:'2099-01-01T00:00:00Z'};
const item={id:'r',version:1,subject:'DEMO',body:'DEMO',evidence_ids:[],updates:[],history:[]};
test('mobile admin shares auth rotation and preserves MFA and idempotency while retrying 401',async()=>{
 const f=await fixture();f.transport.mockResolvedValueOnce(response(mfa));await f.client.verify('DEMO','123456',false);
 f.transport.mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response(item));await f.client.decision('reports','r',{expected_version:1,state:'reviewing',reason:'DEMO'},'same-key');
 const a=f.transport.mock.calls[1][1]!,b=f.transport.mock.calls[2][1]!;expect(a.body).toEqual(b.body);expect(a.headers).toMatchObject({'X-Admin-Session':'DEMO-mfa','Idempotency-Key':'same-key',Authorization:'Bearer access-test-only'});expect(b.headers).toMatchObject({'X-Admin-Session':'DEMO-mfa','Idempotency-Key':'same-key',Authorization:'Bearer rotated'});expect(f.api.refresh).toHaveBeenCalledTimes(1);
});
test('mobile admin validates responses and rejects late MFA and queue results after locking',async()=>{
 const f=await fixture();f.transport.mockResolvedValueOnce(response({enrolled:false}));expect(await f.client.status()).toBe(false);
 f.transport.mockResolvedValueOnce(response({secret:'demo',uri:'demo'}));await f.client.enroll('DEMO');
 let done!:(v:Response)=>void;f.transport.mockImplementationOnce(()=>new Promise(resolve=>{done=resolve;}));const pending=f.client.verify('DEMO','123456',true);f.client.clear();done(response(mfa));await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(f.client.expiresAt).toBe(0);
 f.transport.mockResolvedValueOnce(response({items:[{}],next_cursor:null}));await expect(f.client.page('reports','','all')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 f.transport.mockResolvedValueOnce(response({items:[item],next_cursor:'next'}));expect((await f.client.page('reports','a b','open','cursor')).next_cursor).toBe('next');expect(String(f.transport.mock.calls.at(-1)![0])).toContain('q=a+b&state=open&cursor=cursor');
 f.transport.mockResolvedValueOnce(response(item));await f.client.item('reports','r');
 f.transport.mockResolvedValueOnce(response({items:[],next_cursor:null}));await f.client.audit('cursor');
 f.transport.mockResolvedValueOnce(response({ok:true}));await f.client.lock();expect(f.client.expiresAt).toBe(0);
});
test('non-admin sessions cannot call admin APIs and missing config fails before network',async()=>{
 const f=authFixture();await f.manager.login({email:'user@example.test',password:'DEMO'});const fetcher=jest.fn();const client=new AdminApi(f.manager,session.user.id,'http://localhost:3100/v1',fetcher);await expect(client.status()).rejects.toEqual(new ApiError('FORBIDDEN'));expect(fetcher).not.toHaveBeenCalled();
 const admin=await fixture();await expect(new AdminApi(admin.manager,session.user.id,undefined,admin.transport).status()).rejects.toMatchObject({code:'CONFIG'});await expect(admin.client.photo('photo')).rejects.toMatchObject({code:'FORBIDDEN'});
});
