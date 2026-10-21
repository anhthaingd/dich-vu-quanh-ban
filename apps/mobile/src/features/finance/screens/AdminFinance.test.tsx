import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AdminFinance} from './AdminFinance';
import {AdminApi} from '../../admin/api/admin-api';
import type {AuthSession} from '../../auth/state/auth-session';
import {ApiError} from '../../../lib/http/api-error';
const item={id:'payout',partner_id:'partner',version:3,state:'unknown',amount:'50000',bank_reference:'LOCAL-PAYOUT',bank_last4:'1234',created_at:'2026-10-21T00:00:00Z',history:[]};
function mount(request:jest.Mock){const fail=jest.fn();render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AdminFinance client={{request,photo:jest.fn()} as unknown as AdminApi} grants={['finance.read','finance.review']} locale="vi" fail={fail}/></AppProviders>);return fail;}
test('admin unknown payout reconciles the original transfer and repeats the captured request after lost response',async()=>{
 let attempts=0;const request=jest.fn(async(path:string,_validate:unknown,body:unknown,key?:string)=>{if(key==='')throw new Error('invalid empty retry key');if(path.includes('/decision')){attempts++;if(attempts===1)throw new ApiError('NETWORK');return {...item,state:'succeeded',version:4};}if(body===undefined&&path.endsWith('/payout'))return item;return {items:[item],next_cursor:null};});mount(request);
 await screen.findByText('50.000 ₫ · Chưa rõ kết quả · payout');fireEvent.press(screen.getByText('Rút về ngân hàng'));await screen.findByText('50.000 ₫ · Chưa rõ kết quả · payout');fireEvent.press(screen.getByText('50.000 ₫ · Chưa rõ kết quả · payout'));await screen.findByText('Chưa rõ kết quả; giữ tiền và tra giao dịch gốc trước khi thử lại.');
 fireEvent.changeText(screen.getByLabelText('Lý do / nội dung đối chiếu'),'DEMO reconciled original transfer');fireEvent.press(screen.getByRole('checkbox'));fireEvent.press(screen.getByText('Đối soát thành công'));await screen.findByText('Thử lại đúng thao tác');fireEvent.press(screen.getByText('Thử lại đúng thao tác'));await waitFor(()=>expect(attempts).toBe(2));const decisions=request.mock.calls.filter(([path])=>path.includes('/decision'));expect(decisions[0][2]).toEqual(decisions[1][2]);expect(decisions[0][3]).toBe(decisions[1][3]);expect(decisions[0][2]).toMatchObject({expected_version:3,decision:'succeeded',bank_reference:'LOCAL-PAYOUT',checked:true});
});
test('admin fresh MFA rejection clears private lists and returns control to the MFA screen',async()=>{
 const request=jest.fn().mockRejectedValue(new ApiError('REAUTH_REQUIRED'));const fail=mount(request);await waitFor(()=>expect(fail).toHaveBeenCalledWith(expect.objectContaining({code:'REAUTH_REQUIRED'})));expect(screen.queryByText('50.000 ₫ · Chưa rõ kết quả · payout')).toBeNull();
});

test.each(['malformed','schema'])('admin finance preserves the committed decision receipt after HTTP200 %s response',async(mode)=>{
 let commits=0;const stored=new Map<string,unknown>(),writes:{key:string;body:string}[]=[];const updated={...item,state:'succeeded',version:4};
 const response=(value:unknown)=>({ok:true,status:200,headers:new Headers(),json:async()=>value});
 const transport=jest.fn(async(url:string,init:{body?:string;headers:Record<string,string>})=>{if(url.endsWith('/decision')){const key=init.headers['Idempotency-Key'];writes.push({key,body:init.body!});if(!stored.has(key)){stored.set(key,updated);commits++;return mode==='schema'?response({committed:true}):{...response(null),json:async()=>{throw new SyntaxError('committed invalid JSON');}};}return response(stored.get(key));}if(url.endsWith('/payout'))return response(item);return response({items:[item],next_cursor:null});});
 const manager={adminOperation:async(_owner:string,work:(token:string)=>Promise<unknown>)=>work('access')};const client=new AdminApi(manager as unknown as AuthSession,'owner','http://local/v1',transport as unknown as typeof fetch);
 render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AdminFinance client={client} grants={['finance.read','finance.review']} locale="vi" fail={jest.fn()}/></AppProviders>);
 await screen.findByText('50.000 ₫ · Chưa rõ kết quả · payout');fireEvent.press(screen.getByText('Rút về ngân hàng'));await screen.findByText('50.000 ₫ · Chưa rõ kết quả · payout');fireEvent.press(screen.getByText('50.000 ₫ · Chưa rõ kết quả · payout'));await screen.findByText('Chưa rõ kết quả; giữ tiền và tra giao dịch gốc trước khi thử lại.');
 fireEvent.changeText(screen.getByLabelText('Lý do / nội dung đối chiếu'),'DEMO original receipt');fireEvent.press(screen.getByRole('checkbox'));fireEvent.press(screen.getByText('Đối soát thành công'));await screen.findByText('Thử lại đúng thao tác');expect(screen.getByLabelText('Lý do / nội dung đối chiếu')).toHaveProp('editable',false);fireEvent.press(screen.getByText('Thử lại đúng thao tác'));await waitFor(()=>expect(writes).toHaveLength(2));expect(writes[0]).toEqual(writes[1]);expect(commits).toBe(1);
});
test('Hermes-style Intl formats finance admin amounts without converting BigInt to Number',async()=>{
 const NativeNumberFormat=Intl.NumberFormat;const intl=jest.spyOn(Intl,'NumberFormat').mockImplementation((locale,options)=>{const real=new NativeNumberFormat(locale,options);return {format:(value:number|bigint)=>{if(typeof value==='bigint')throw new TypeError('Cannot convert BigInt to number');return real.format(value);}} as Intl.NumberFormat;});
 try{mount(jest.fn().mockResolvedValue({items:[{...item,amount:'900719925474099312345'}],next_cursor:null}));await screen.findByText('900.719.925.474.099.312.345 ₫ · Chưa rõ kết quả · payout');}finally{intl.mockRestore();}
});
