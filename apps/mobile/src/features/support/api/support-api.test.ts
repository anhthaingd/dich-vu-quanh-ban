import {createSupportApi,isReport} from './support-api';
const report={id:'r',state:'open',version:1,kind:'account',subject:'DEMO',body:'Help',job_id:null,invoice_id:null,evidence_ids:[],updates:[]};
test('support client preserves context, evidence and retry keys and rejects private or malformed responses',async()=>{
 const transport=jest.fn().mockImplementation(async()=>new Response(JSON.stringify(report))),api=createSupportApi('http://local/v1/',transport);
 await api.create('token',{kind:'service',subject:'DEMO',body:'Help',job_id:'j',evidence_ids:['photo']},'same-key');
 expect(transport.mock.calls[0][0]).toBe('http://local/v1/reports');expect(transport.mock.calls[0][1].headers['Idempotency-Key']).toBe('same-key');expect(JSON.parse(transport.mock.calls[0][1].body).evidence_ids).toEqual(['photo']);
 await api.get('token','a/b');expect(transport.mock.calls.at(-1)?.[0]).toBe('http://local/v1/reports/a%2Fb');
 await api.reply('token','r','More',['photo2'],'reply-key');expect(JSON.parse(transport.mock.calls.at(-1)?.[1].body)).toEqual({body:'More',evidence_ids:['photo2']});
 transport.mockImplementation(async()=>new Response(JSON.stringify({items:[report],next_cursor:null})));await api.list('token','a/b');expect(transport.mock.calls.at(-1)?.[0]).toContain('cursor=a%2Fb');
 expect(isReport({...report,updates:[{actor_id:'admin',body:'Private',visibility:'admin_only',created_at:'2026-10-16T00:00:00Z',evidence_ids:[]}]})).toBe(false);
 transport.mockImplementation(async()=>new Response(JSON.stringify({...report,evidence_ids:[1]})));await expect(api.get('token','r')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createSupportApi(undefined).list('token')).rejects.toMatchObject({code:'CONFIG'});
});
test('support uploads resume ready evidence, retain photo bytes, and reject expired grants and failed uploads',async()=>{
 const asset={id:'a',status:'ready',download_url:'http://local/a',expires_at:'2099-01-01T00:00:00Z'},grant={asset_id:'a',upload_url:'http://local/upload',expires_at:'2099-01-01T00:00:00Z',required_headers:{'Content-Type':'image/png'}};
 const response=(v:unknown)=>new Response(JSON.stringify(v));const transport=jest.fn().mockResolvedValueOnce(response(grant)).mockResolvedValueOnce(response({...asset,status:'pending'})).mockResolvedValueOnce(response({})).mockResolvedValueOnce(response(asset));
 const api=createSupportApi('http://local/v1',transport),blob=new Blob(['DEMO'],{type:'image/png'});expect(await api.upload('t',blob,'k')).toEqual(asset);expect(JSON.parse(transport.mock.calls[0][1].body).purpose).toBe('evidence');expect(transport.mock.calls[2][1].body).toBe(blob);
 transport.mockResolvedValueOnce(response(grant)).mockResolvedValueOnce(response(asset));await api.upload('t',blob,'k');expect(transport).toHaveBeenCalledTimes(6);
 transport.mockResolvedValueOnce(response({...grant,expires_at:'2000-01-01T00:00:00Z'})).mockResolvedValueOnce(response({...asset,status:'pending'}));await expect(api.upload('t',blob,'k2')).rejects.toMatchObject({code:'VALIDATION'});
 transport.mockResolvedValueOnce(response(grant)).mockResolvedValueOnce(response({...asset,status:'pending'})).mockResolvedValueOnce(new Response('',{status:500}));await expect(api.upload('t',blob,'k3')).rejects.toMatchObject({code:'NETWORK'});
 transport.mockResolvedValueOnce(response(asset));expect(await api.asset('t','a')).toEqual(asset);
});
