import {createVerificationApi,isVerification} from './verification-api';
const row={id:'r',partner_id:'p',kind:'identity',state:'awaiting_evidence',version:2,reason:'More',details:{kind:'identity',statement:'DEMO'},document_asset_ids:[],created_at:'2026-10-19T00:00:00Z',history:[]};
test('verification API preserves predecessor version and retry key, encodes scope and rejects malformed private responses',async()=>{
 const transport=jest.fn().mockImplementation(async()=>new Response(JSON.stringify(row))),api=createVerificationApi('http://local/v1',transport);
 const input={document_asset_ids:['photo'],details:{kind:'identity' as const,statement:'DEMO'},previous_request_id:'old',expected_version:2};await api.submit('t','p/a',input,'same');expect(transport.mock.calls[0][0]).toBe('http://local/v1/partners/p%2Fa/verification');expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual(input);expect(transport.mock.calls[0][1].headers['Idempotency-Key']).toBe('same');
 expect(isVerification({...row,details:{}})).toBe(false);expect(isVerification({...row,document_asset_ids:[3]})).toBe(false);
 transport.mockImplementation(async()=>new Response(JSON.stringify({items:[row],next_cursor:null})));await api.list('t','p','x/y');expect(transport.mock.calls.at(-1)?.[0]).toContain('cursor=x%2Fy');
 await expect(createVerificationApi(undefined).list('t','p')).rejects.toMatchObject({code:'CONFIG'});
});
test('verification upload uses private purpose and resumes completed bytes on retry',async()=>{
 const asset={id:'a',status:'ready',download_url:'http://local/a',expires_at:'2099-01-01T00:00:00Z'},grant={asset_id:'a',upload_url:'http://local/upload',expires_at:'2099-01-01T00:00:00Z',required_headers:{'Content-Type':'image/png'}};const r=(v:unknown)=>new Response(JSON.stringify(v));const transport=jest.fn().mockResolvedValueOnce(r(grant)).mockResolvedValueOnce(r({...asset,status:'pending'})).mockResolvedValueOnce(r({})).mockResolvedValueOnce(r(asset));const api=createVerificationApi('http://local/v1',transport);await api.upload('t',new Blob(['DEMO'],{type:'image/png'}),'k');expect(JSON.parse(transport.mock.calls[0][1].body).purpose).toBe('verification');transport.mockResolvedValueOnce(r(grant)).mockResolvedValueOnce(r(asset));await api.upload('t',new Blob(['DEMO'],{type:'image/png'}),'k');expect(transport).toHaveBeenCalledTimes(6);
});
