import { createAccountsApi } from './accounts-api';
import { session } from '../../../../test/helpers/auth';
const input = { expected_version: 1, display_name: 'Name' };
test('profile PATCH sends version and operation key, validates version in Me', async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => session.user });
  const api = createAccountsApi('http://localhost/v1/', fetcher);
  await api.edit('token', input, 'operation-key');
  expect(fetcher).toHaveBeenCalledWith('http://localhost/v1/me', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input), headers: expect.objectContaining({ Authorization: 'Bearer token', 'Idempotency-Key': 'operation-key' }) }));
  fetcher.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...session.user, version: undefined }) });
  await expect(api.edit('token', input, 'key')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  await expect(createAccountsApi(undefined).edit('token', input, 'key')).rejects.toMatchObject({ code: 'CONFIG' });
});
test.each(['VERSION_CONFLICT', 'IDEMPOTENCY_MISMATCH', 'SECRET_BODY'])('only known conflict codes reach UI: %s', async code => {
  const api = createAccountsApi('http://localhost/v1', jest.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code }) }));
  await expect(api.edit('token', input, 'key')).rejects.toMatchObject({ code: code === 'SECRET_BODY' ? 'HTTP' : code });
});
test('address and session adapters enforce schemas, cursor encoding, mutation verbs and operation keys',async()=>{
  const address={id:session.user.id,version:1,label:'Home',is_default:true,address:{text:'Street',point:{latitude:10,longitude:106}}};
  const login={id:session.user.id,version:1,state:'active',is_current:true,created_at:'2026-10-06T00:00:00Z',last_seen_at:null};
  const fetcher=jest.fn();const api=createAccountsApi('http://localhost/v1',fetcher);
  const response=(x:unknown)=>({ok:true,status:200,json:async()=>x});
  fetcher.mockResolvedValueOnce(response({items:[address],next_cursor:'next'}));expect((await api.addresses('token','a+b')).items).toEqual([address]);expect(fetcher.mock.calls[0][0]).toContain('cursor=a%2Bb');
  fetcher.mockResolvedValueOnce(response(address));await api.saveAddress('token',null,{label:address.label,address:address.address,is_default:false},'key');expect(fetcher.mock.calls.at(-1)[1].method).toBe('POST');
  fetcher.mockResolvedValueOnce(response(address));await api.saveAddress('token',address.id,{...address,expected_version:1},'key2');expect(fetcher.mock.calls.at(-1)[1].method).toBe('PUT');
  fetcher.mockResolvedValueOnce(response({id:address.id,version:2,state:'archived'}));await api.archiveAddress('token',address.id,'key3');expect(fetcher.mock.calls.at(-1)[1].headers['Idempotency-Key']).toBe('key3');
  fetcher.mockResolvedValueOnce(response({items:[login],next_cursor:null}));expect((await api.sessions('token')).items).toEqual([login]);
  fetcher.mockResolvedValueOnce(response({...login,state:'revoked'}));await api.revokeSession('token',login.id,'key4');expect(fetcher.mock.calls.at(-1)[0]).toContain('/revoke');
  for(const invalid of [{items:[{...address,version:0}],next_cursor:null},{items:[{...address,address:{text:'x',point:{latitude:91,longitude:0}}}],next_cursor:null},{items:[],next_cursor:123}]) {fetcher.mockResolvedValueOnce(response(invalid));await expect(api.addresses('token')).rejects.toMatchObject({code:'INVALID_RESPONSE'});}
  fetcher.mockResolvedValueOnce(response({items:[{...login,created_at:'bad'}],next_cursor:null}));await expect(api.sessions('token')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
});
