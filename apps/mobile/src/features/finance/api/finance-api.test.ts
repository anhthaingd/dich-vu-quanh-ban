import {FinanceApi,isBank,isBankAccount,isFinanceItem,isFinancePage} from './finance-api';
import {FinanceAdminApi} from './finance-admin-api';
import type {AuthSession} from '../../auth/state/auth-session';
import {ApiError} from '../../../lib/http/api-error';
const account={id:'bank',bank_code:'DEMO',account_last4:'1234',holder_name:'DEMO',version:1,status:'verified'};
const bank={partner_id:'partner',version:2,current:account,pending:null};
const item={id:'request',partner_id:'partner',version:1,state:'pending',amount:'50000',created_at:'2026-10-21T00:00:00Z',history:[]};
const response=(v:unknown)=>({ok:true,status:200,headers:new Headers(),json:async()=>v});
test('finance validators reject malformed balances, account numbers, histories and dates',()=>{
 expect(isBankAccount(account)).toBe(true);expect(isBank(bank)).toBe(true);expect(isFinanceItem(item)).toBe(true);expect(isFinancePage({items:[item],next_cursor:null})).toBe(true);
 for(const bad of [null,{...account,account_last4:'12345678'},{...account,version:0}])expect(isBankAccount(bad)).toBe(false);
 for(const bad of [null,{...bank,version:0},{...bank,current:{...account,account_last4:1234}}])expect(isBank(bad)).toBe(false);
 for(const bad of [null,{...item,amount:'-1'},{...item,created_at:'bad'},{...item,history:[{reason:3}]}])expect(isFinanceItem(bad)).toBe(false);
 expect(isFinanceItem({...item,amount:undefined,bank_code:'DEMO',account_last4:'1234'})).toBe(true);expect(isFinancePage({items:[item],next_cursor:3})).toBe(false);
});
test('finance API uses owner-aware session wrapper, stable retry payload and validated private response',async()=>{
 const manager={featureOperation:jest.fn(async(_owner,work)=>work('access'))},transport=jest.fn().mockResolvedValue(response(bank)),api=new FinanceApi(manager as unknown as AuthSession,'owner','http://local/v1/',transport);
 await api.bank('partner');expect(manager.featureOperation).toHaveBeenCalledWith('owner',expect.any(Function),true);expect(transport.mock.calls[0][0]).toBe('http://local/v1/partners/partner/bank');
 transport.mockResolvedValue(response(item));const body={partner_id:'partner',amount:'50000',bank_account_id:'bank',reauth_grant:'secret'};await api.request('/payouts',isFinanceItem,body,'same-key');await api.request('/payouts',isFinanceItem,body,'same-key');expect(transport.mock.calls[1][1].body).toEqual(transport.mock.calls[2][1].body);expect(transport.mock.calls[1][1].headers['Idempotency-Key']).toEqual(transport.mock.calls[2][1].headers['Idempotency-Key']);expect(transport.mock.calls[1][1]).toMatchObject({method:'POST',body:JSON.stringify(body),headers:{Authorization:'Bearer access','Idempotency-Key':'same-key'}});
 transport.mockResolvedValueOnce(response({grant:'secret',expires_at:'2099-01-01T00:00:00Z'}));await api.reauth('password','payout');expect(transport.mock.calls.at(-1)[1].body).toBe(JSON.stringify({password:'password',scope:'payout'}));
 transport.mockResolvedValue(response({items:[item],next_cursor:null}));await api.history('partner','payouts','cursor/value');expect(transport.mock.calls.at(-1)[0]).toContain('cursor=cursor%2Fvalue');
 transport.mockResolvedValue(response(item));await api.detail('payouts','request');transport.mockResolvedValue(response({...item,amount:4}));await expect(api.detail('payouts','request')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 manager.featureOperation.mockRejectedValueOnce(new ApiError('CANCELLED'));await expect(api.detail('payouts','request')).rejects.toMatchObject({code:'CANCELLED'});
 await expect(new FinanceApi(manager as unknown as AuthSession,'owner',undefined,transport).bank('p')).rejects.toMatchObject({code:'CONFIG'});
});
test('admin finance adapter preserves MFA request wrapper and original decisions including reconcile scenario',async()=>{
 const request=jest.fn().mockResolvedValue({items:[item],next_cursor:null}),api=new FinanceAdminApi(request);await api.list('payouts','DEMO','unknown','cursor');expect(request.mock.calls[0][0]).toBe('/admin/payouts?q=DEMO&state=unknown&cursor=cursor');
 request.mockResolvedValue(item);await api.detail('payouts','request');const body={expected_version:2,decision:'transferring',reason:'DEMO',checked:true,simulator_scenario:'timeout_after_success'};await api.decision('payouts','request',body,'stable');expect(request.mock.calls.at(-1)).toEqual(['/admin/payouts/request/decision',expect.any(Function),body,'stable']);
 await api.deposit({partner_id:'partner',amount:'50000',reference:'LOCAL'},'deposit-key');expect(request.mock.calls.at(-1)[0]).toBe('/admin/finance-simulator/deposits');expect(request.mock.calls.at(-1)[1]({state:'recorded'})).toBe(true);expect(request.mock.calls.at(-1)[1]({state:'success'})).toBe(false);
});
