import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
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
