import {createInvoicesApi,isInvoice} from './invoices-api';
import {invoice,asset} from '../../../../test/helpers/invoices';
const response=(value:unknown)=>({ok:true,status:200,headers:new Headers(),json:async()=>value});
test('invoice response rejects invalid money, version, flags and private schema corruption',()=>{
 expect(isInvoice(invoice)).toBe(true);
 for(const invalid of [null,{...invoice,note:null},{...invoice,revision_reason:3},{...invoice,id:0},{...invoice,version:0},{...invoice,state:'paid'},{...invoice,labor:'-1'},{...invoice,cash_due:4},{...invoice,customer_payment_reported_at:'bad'},{...invoice,settled:'yes'},{...invoice,result_asset_ids:[4]}])expect(isInvoice(invalid)).toBe(false);
 expect(isInvoice({...invoice,revision_reason:'fix',worker_receipt_confirmed_at:'2026-10-08T00:00:00Z'})).toBe(true);
});
test('invoice methods encode resources, preserve operation keys and validate settlement envelope',async()=>{
 const transport=jest.fn().mockResolvedValue(response(invoice)),api=createInvoicesApi('http://local/v1/',transport);
 await api.get('test','job/id');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/jobs/job%2Fid/invoice');
 const input={expected_version:3,labor:'2',materials:'0'};await api.save('test','job',input,'draft-key');expect(transport.mock.calls.at(-1)[1]).toMatchObject({method:'PUT',body:JSON.stringify(input),headers:{Authorization:'Bearer test','Idempotency-Key':'draft-key'}});
 await api.change('test','invoice','confirm',{expected_version:3,version_id:'v1',points_used:'0'},'confirm-key');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/invoices/invoice/confirm');
 transport.mockResolvedValueOnce(response({invoice,settlement_id:'settlement',actor_kind:'worker'}));expect(await api.change('test','invoice','settle',{expected_version:4,received_in_full:true},'settle-key')).toEqual(invoice);
 transport.mockResolvedValueOnce(response({invoice,settlement_id:'settlement',actor_kind:'admin'}));await expect(api.change('test','invoice','settle',{expected_version:4},'key')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createInvoicesApi(undefined,transport).get('test','job')).rejects.toMatchObject({code:'CONFIG'});await expect(createInvoicesApi('file://local',transport).get('test','job')).rejects.toMatchObject({code:'CONFIG'});
});
test('wallet, point and ledger boundaries validate signed balances, dates and page cursors',async()=>{
 const transport=jest.fn(),api=createInvoicesApi('http://local/v1',transport);
 transport.mockResolvedValueOnce(response({balance:'80000',held:'50000',available:'30000'}));await api.points('test');
 transport.mockResolvedValueOnce(response({partner_id:'partner',balance:'-20000',fee_holds:'0',withdrawal_holds:'0',withdrawable:'0',fee_credit_limit:'100000',shortfall:'0'}));await api.wallet('test','partner');
 const entry={id:'entry',kind:'invoice_net',amount:'-20000',unit:'VND',created_at:'2026-10-08T00:00:00Z',reference_id:'invoice'};
 transport.mockResolvedValue(response({items:[entry],next_cursor:null}));await api.ledger('test','p/1','cursor/value');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/partners/p%2F1/ledger?cursor=cursor%2Fvalue');await api.ledger('test');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/me/points/ledger');
 transport.mockResolvedValueOnce(response({items:[{...entry,created_at:'bad'}],next_cursor:null}));await expect(api.ledger('test')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 transport.mockResolvedValueOnce(response({balance:'0',held:'0',available:'-1'}));await expect(api.points('test')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 transport.mockResolvedValueOnce(response(asset));await api.asset('test','photo');
 transport.mockResolvedValueOnce(response({...asset,status:'public'}));await expect(api.asset('test','photo')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
});
test('upload retry discovers ready asset without re-uploading; pending upload completes under same key',async()=>{
 const grant={asset_id:'photo',upload_url:'http://local/upload',expires_at:'2099-01-01T00:00:00Z',required_headers:{'Content-Type':'image/png'}};
 const transport=jest.fn(),api=createInvoicesApi('http://local/v1',transport),blob=new Blob(['DEMO'],{type:'image/png'});
 transport.mockResolvedValueOnce(response(grant)).mockResolvedValueOnce(response(asset));expect(await api.upload('test',blob,'upload-key')).toEqual(asset);expect(transport).toHaveBeenCalledTimes(2);
 transport.mockClear();transport.mockResolvedValueOnce(response(grant)).mockResolvedValueOnce(response({...asset,status:'pending',download_url:null,expires_at:null})).mockResolvedValueOnce({ok:true,status:200}).mockResolvedValueOnce(response(asset));await api.upload('test',blob,'upload-key');expect(transport.mock.calls[2]).toEqual([grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob}]);expect(transport.mock.calls[3][1].headers['Idempotency-Key']).toBe('upload-key');
 transport.mockClear();transport.mockResolvedValueOnce(response({...grant,expires_at:'2000-01-01T00:00:00Z'})).mockResolvedValueOnce(response({...asset,status:'pending'}));await expect(api.upload('test',blob,'key')).rejects.toMatchObject({code:'VALIDATION'});expect(transport).toHaveBeenCalledTimes(2);
});
test.each([[400,'VALIDATION'],[404,'NOT_FOUND'],[503,'NETWORK']])('upload HTTP %s retains correct retry classification',async(status,code)=>{
 const transport=jest.fn().mockResolvedValueOnce(response({asset_id:'photo',upload_url:'http://local/upload',expires_at:'2099-01-01T00:00:00Z',required_headers:{}})).mockResolvedValueOnce(response({...asset,status:'pending'})).mockResolvedValueOnce({ok:false,status});await expect(createInvoicesApi('http://local/v1',transport).upload('test',new Blob(['DEMO']),'key')).rejects.toMatchObject({code});
});
