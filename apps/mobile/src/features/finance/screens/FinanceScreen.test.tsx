import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react-native';
import {AppProviders} from '../../../app/providers/AppProviders';
import {FinanceScreen} from './FinanceScreen';
import type {Bank} from '../models';
const mockManager={getSnapshot:()=>({busy:false,user:{id:'owner'}}),getWallet:jest.fn(),getLedger:jest.fn(),myMemberships:jest.fn(),featureOperation:jest.fn()};
jest.mock('../../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:mockManager,state:{user:{id:'owner'}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:(callback:()=>void)=>{jest.requireActual('react').useEffect(callback,[callback]);}}));
const wallet={partner_id:'partner',balance:'100000',fee_holds:'10000',withdrawal_holds:'0',withdrawable:'90000',fee_credit_limit:'100000',shortfall:'0'};
const response=(v:unknown)=>({ok:true,status:200,headers:new Headers(),json:async()=>v});
const initial:Bank={partner_id:'partner',version:1,current:null,pending:null};
let fetchMock:jest.Mock;
beforeEach(()=>{process.env.EXPO_PUBLIC_API_URL='http://local/v1';mockManager.getWallet.mockResolvedValue(wallet);mockManager.getLedger.mockResolvedValue({items:[],next_cursor:null});mockManager.myMemberships.mockResolvedValue({items:[{partner_id:'partner',is_owner:true,active:true,permissions:[]}]});mockManager.featureOperation.mockImplementation(async(_owner,work)=>work('access'));fetchMock=jest.fn(async(url:string)=>response(url.endsWith('/bank')?initial:{items:[],next_cursor:null}));globalThis.fetch=fetchMock;});
function mount(){render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><FinanceScreen partnerId="partner" onBack={jest.fn()}/></AppProviders>);}
test('history opens detail above the list and dismisses back to the same filter',async()=>{
 const item={id:'topup-existing',partner_id:'partner',version:1,state:'pending',amount:'50000',created_at:'2026-11-02T00:00:00Z',history:[]};
 fetchMock.mockImplementation(async(url:string)=>response(url.endsWith('/topups/topup-existing')?item:url.endsWith('/bank')?initial:url.includes('/topups')?{items:[item],next_cursor:null}:{items:[],next_cursor:null}));
 mount();await screen.findByTestId('finance-history');fireEvent.press(screen.getByTestId('finance-history'));fireEvent.press(screen.getByRole('tab',{name:'Nạp tiền'}));
 fireEvent.press(screen.getByTestId('finance-item-topup-existing'));const modal=await screen.findByTestId('finance-detail-modal');expect(within(modal).getByText('topup-existing')).toBeTruthy();
 fireEvent(modal,'requestClose');await waitFor(()=>expect(screen.queryByTestId('finance-detail-modal')).toBeNull());expect(screen.getByRole('tab',{name:'Nạp tiền'})).toHaveProp('accessibilityState',expect.objectContaining({selected:true}));
});
test.each(['network','malformed','schema'])('wallet bank request retains exact payload and grant after committed %s response and keeps current bank while pending',async(mode)=>{
 const proposed={...initial,version:2,pending:{id:'request',bank_code:'DEMO',account_last4:'7890',holder_name:'DEMO OWNER',status:'pending',version:2}};let attempts=0,current=initial;
 fetchMock.mockImplementation(async(url:string,init:{method:string})=>{
  if(url.endsWith('/reauthenticate'))return response({grant:'g'.repeat(64),expires_at:'2099-01-01T00:00:00Z'});
  if(init.method==='PUT'){attempts++;current=proposed;if(attempts===1){if(mode==='network')throw new Error('lost response');if(mode==='schema')return response({committed:true});return {...response(null),json:async()=>{throw new SyntaxError('invalid JSON after commit');}};}return response(proposed);}
  return response(url.endsWith('/bank')?current:{items:[],next_cursor:null});
 });
 mount();await screen.findByText('100.000 ₫');fireEvent.press(screen.getByTestId('finance-bank'));fireEvent.changeText(screen.getByTestId('finance-bank-code'),'DEMO');fireEvent.changeText(screen.getByTestId('finance-bank-number'),'1234567890');fireEvent.changeText(screen.getByTestId('finance-bank-holder'),'DEMO OWNER');fireEvent.changeText(screen.getByTestId('finance-reason'),'DEMO new bank');fireEvent.changeText(screen.getByTestId('finance-password'),'DEMO password');fireEvent.press(screen.getByTestId('finance-send'));
 await screen.findByText('Thử lại đúng thao tác');expect(screen.getByTestId('finance-bank-number')).toHaveProp('editable',false);fireEvent.press(screen.getByText('Thử lại đúng thao tác'));await screen.findByText('Đề nghị mới đang chờ. Tài khoản hiện tại vẫn dùng.');const writes=fetchMock.mock.calls.filter(([,init])=>init.method==='PUT');expect(writes).toHaveLength(2);expect(writes[0][1].body).toBe(writes[1][1].body);expect(writes[0][1].headers['Idempotency-Key']).toBe(writes[1][1].headers['Idempotency-Key']);expect(screen.queryByDisplayValue('1234567890')).toBeNull();expect(fetchMock.mock.calls.filter(([url])=>url.endsWith('/reauthenticate'))).toHaveLength(1);expect(JSON.parse(writes[0][1].body).reauth_grant).toBe('g'.repeat(64));
});
test('wallet read-only member sees totals while finance mutation controls are disabled',async()=>{
 mockManager.myMemberships.mockResolvedValue({items:[{partner_id:'partner',is_owner:false,active:true,permissions:['wallet.read']}]});mount();await screen.findByText('90.000 ₫');expect(screen.getByTestId('finance-topup')).toBeDisabled();expect(screen.getByTestId('finance-payout')).toBeDisabled();fireEvent.press(screen.getByTestId('finance-bank'));await screen.findByText('Bạn chưa được cấp quyền thao tác này.');expect(screen.queryByTestId('finance-bank-number')).toBeNull();await waitFor(()=>expect(fetchMock).toHaveBeenCalled());
});

test('wallet finds active permissions through membership cursors instead of disabling a partner on a later page',async()=>{
 mockManager.myMemberships.mockResolvedValueOnce({items:[{partner_id:'different',is_owner:false,active:true,permissions:['wallet.read']}],next_cursor:'next-page'}).mockResolvedValueOnce({items:[{partner_id:'partner',is_owner:false,active:true,permissions:['wallet.read','wallet.topup','bank.manage']}],next_cursor:null});
 mount();await screen.findByText('90.000 ₫');expect(mockManager.myMemberships).toHaveBeenLastCalledWith('owner','next-page');expect(screen.getByTestId('finance-topup')).not.toBeDisabled();fireEvent.press(screen.getByTestId('finance-bank'));expect(screen.getByTestId('finance-bank-number')).toBeTruthy();
});
test('Hermes-style Intl rejects BigInt but wallet preserves arbitrary precision and grouping',async()=>{
 const NativeNumberFormat=Intl.NumberFormat;const intl=jest.spyOn(Intl,'NumberFormat').mockImplementation((locale,options)=>{const real=new NativeNumberFormat(locale,options);return {format:(value:number|bigint)=>{if(typeof value==='bigint')throw new TypeError('Cannot convert BigInt to number');return real.format(value);}} as Intl.NumberFormat;});
 try{mockManager.getWallet.mockResolvedValue({...wallet,balance:'900719925474099312345',withdrawable:'900719925474099302345'});mount();await screen.findByText('900.719.925.474.099.312.345 ₫');expect(screen.getByText('900.719.925.474.099.302.345 ₫')).toBeTruthy();}finally{intl.mockRestore();}
});

test('withdrawal explains the missing bank and offers recovery only to a bank manager',async()=>{
 const mounted=render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><FinanceScreen partnerId="partner" onBack={jest.fn()}/></AppProviders>);
 await screen.findByTestId('finance-payout-reason');expect(screen.getByTestId('finance-payout')).toBeDisabled();
 fireEvent.press(screen.getByTestId('finance-bank-recovery'));expect(screen.getByTestId('finance-bank-number')).toBeTruthy();mounted.unmount();
 mockManager.myMemberships.mockResolvedValue({items:[{partner_id:'partner',is_owner:false,active:true,permissions:['wallet.read','wallet.withdraw']}]});mount();
 await screen.findByTestId('finance-payout-reason');expect(screen.queryByTestId('finance-bank-recovery')).toBeNull();expect(screen.getByTestId('finance-payout')).toBeDisabled();
});

test('verified bank with insufficient funds shows the minimum rather than opening an unusable payout form',async()=>{
 mockManager.getWallet.mockResolvedValue({...wallet,withdrawable:'49000'});
 fetchMock.mockImplementation(async(url:string)=>response(url.endsWith('/bank')?{...initial,current:{id:'bank',bank_code:'DEMO',account_last4:'1234',holder_name:'DEMO',status:'approved',version:1}}:{items:[],next_cursor:null}));
 mount();await screen.findByText('Số tiền có thể rút chưa đủ mức tối thiểu 50.000 ₫.');expect(screen.getByTestId('finance-payout')).toBeDisabled();expect(screen.queryByTestId('finance-bank-recovery')).toBeNull();
});

test('topup validates the amount, displays the recorded request and clears it before another request',async()=>{
 const item={id:'topup-created',partner_id:'partner',version:1,state:'pending',amount:'50000',created_at:'2026-11-02T00:00:00Z',history:[]};
 fetchMock.mockImplementation(async(url:string,init:{method:string})=>response(init.method==='POST'?item:url.endsWith('/bank')?initial:{items:[],next_cursor:null}));
 mount();await screen.findByTestId('finance-topup');fireEvent.press(screen.getByTestId('finance-topup'));expect(screen.getByTestId('finance-send')).toBeDisabled();
 fireEvent.changeText(screen.getByTestId('finance-amount'),'0');expect(screen.getByTestId('finance-send')).toBeDisabled();
 fireEvent.changeText(screen.getByTestId('finance-amount'),'50000');fireEvent.press(screen.getByTestId('finance-send'));
 await screen.findByText('topup-created');expect(screen.queryByTestId('finance-send')).toBeNull();expect(screen.getByText('Chờ duyệt')).toBeTruthy();
 await waitFor(()=>expect(screen.getByText('Đã lưu. Trạng thái tiền được đọc từ máy chủ.')).toBeTruthy());
 expect(fetchMock.mock.calls.filter(([,init])=>init.method==='POST')).toHaveLength(1);fireEvent.press(within(screen.getByTestId('finance-detail-modal')).getByTestId('nav-back'));fireEvent.press(screen.getByTestId('nav-back'));fireEvent.press(screen.getByTestId('finance-topup'));expect(screen.getByTestId('finance-amount')).toHaveProp('value','');expect(screen.getByTestId('finance-send')).toBeDisabled();
});


test('back leaves the bank form during a read refresh without losing the loading guard on money actions',async()=>{
 mount();await screen.findByTestId('finance-bank');fireEvent.press(screen.getByTestId('finance-bank'));
 const reads=mockManager.getWallet.mock.calls.length;let finish!:(value:typeof wallet)=>void;
 mockManager.getWallet.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 fireEvent.press(screen.getByRole('button',{name:'Tải lại'}));
 await waitFor(()=>expect(mockManager.getWallet).toHaveBeenCalledTimes(reads+1));
 fireEvent.press(screen.getByTestId('nav-back'));
 expect(screen.getByTestId('finance-topup')).toBeDisabled();
 expect(screen.queryByTestId('finance-bank-number')).toBeNull();
 await act(async()=>finish(wallet));
 await waitFor(()=>expect(screen.getByTestId('finance-topup')).not.toBeDisabled());
 expect(fetchMock.mock.calls.some(([,init])=>['POST','PUT','DELETE'].includes(init.method))).toBe(false);
});

test('back ignores a late finance detail response and unlocks the overview when that read finishes',async()=>{
 const item={id:'topup-existing',partner_id:'partner',version:1,state:'pending',amount:'50000',created_at:'2026-11-02T00:00:00Z',history:[]};
 let finish!:(value:ReturnType<typeof response>)=>void;
 fetchMock.mockImplementation(async(url:string)=>{
  if(url.endsWith('/topups/topup-existing'))return new Promise(resolve=>{finish=resolve;});
  return response(url.endsWith('/bank')?initial:url.includes('/topups')?{items:[item],next_cursor:null}:{items:[],next_cursor:null});
 });
 mount();await screen.findByTestId('finance-history');fireEvent.press(screen.getByTestId('finance-history'));
 fireEvent.press(screen.getByTestId('finance-item-topup-existing'));
 await waitFor(()=>expect(finish).toBeDefined());fireEvent.press(screen.getByTestId('nav-back'));
 expect(screen.getByTestId('finance-topup')).toBeDisabled();
 await act(async()=>finish(response(item)));
 await waitFor(()=>expect(screen.getByTestId('finance-topup')).not.toBeDisabled());
 expect(screen.queryByText('topup-existing')).toBeNull();
});

test('wallet keeps balance and ledger visible when banking is unavailable and recovers on refresh',async()=>{
 mockManager.getLedger.mockResolvedValue({items:[{id:'entry',kind:'invoice_settlement',amount:'-10000',unit:'VND',created_at:'2026-11-06T00:00:00Z',reference_id:'invoice',posting_code:'invoice_net'}],next_cursor:null});
 fetchMock.mockResolvedValue({ok:false,status:503,headers:new Headers(),json:async()=>({code:'SERVICE_UNAVAILABLE'})});
 mount();await screen.findByText('100.000 ₫');expect(screen.getByTestId('finance-topup')).toBeDisabled();expect(screen.getByTestId('finance-payout')).toBeDisabled();
 expect(screen.getByTestId('finance-bank-unavailable')).toBeTruthy();fireEvent.press(screen.getByTestId('finance-history'));expect(screen.getByText(/10.000/)).toBeTruthy();
 fireEvent.press(screen.getByTestId('nav-back'));
 fetchMock.mockImplementation(async(url:string)=>response(url.endsWith('/bank')?initial:{items:[],next_cursor:null}));
 fireEvent.press(screen.getByRole('button',{name:'Tải lại'}));await waitFor(()=>expect(screen.getByTestId('finance-topup')).not.toBeDisabled());expect(screen.queryByTestId('finance-bank-unavailable')).toBeNull();
});

test('wallet and banking screens label balances as test money without real payment value',async()=>{
 mount();await screen.findByText('100.000 ₫');expect(screen.getByText('TIỀN TEST — không có giá trị thanh toán')).toBeTruthy();
 fireEvent.press(screen.getByTestId('finance-bank'));expect(screen.getByText('TIỀN TEST — không có giá trị thanh toán')).toBeTruthy();
});

test('banking permission loss clears wallet data instead of being treated as a temporary outage',async()=>{
 mount();await screen.findByText('100.000 ₫');await waitFor(()=>expect(screen.getByRole('button',{name:'Tải lại'})).not.toBeDisabled());fetchMock.mockResolvedValue({ok:false,status:403,headers:new Headers(),json:async()=>({code:'FORBIDDEN'})});
 await act(async()=>{fireEvent.press(screen.getByRole('button',{name:'Tải lại'}));});await waitFor(()=>expect(screen.queryByText('100.000 ₫')).toBeNull());expect(screen.queryByTestId('finance-bank-unavailable')).toBeNull();expect(screen.queryByTestId('finance-topup')).toBeNull();
});
