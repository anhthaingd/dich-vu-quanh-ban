import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {ApiError} from '../../../lib/http/api-error';
import {RecoveryPanel} from './RecoveryPanel';
import {LocaleProvider} from '../../../app/providers/LocaleProvider';
import {LocaleState} from '../../../lib/i18n/locale-state';
const a={id:'CASE-A',user_id:'USER-A',state:'pending',version:1},b={...a,id:'CASE-B'};
function mount(domain:'recovery-reports'|'account-deletions'='recovery-reports'){
 const request=jest.fn(async(path:string,_validate:unknown,body?:unknown,_key?:string):Promise<unknown>=>{void _validate;void body;void _key;
  if(path.includes('/decision'))return {id:a.id,state:'approved',version:2};
  if(path.includes('?'))return path.includes('cursor=next')?{items:[b],next_cursor:null}:{items:[a],next_cursor:'next'};
  return {...a,contact:'new@example.test',evidence:'DEMO ownership evidence',...(domain==='account-deletions'?{obligations:{blocked:true,reasons:['JOB'],points:'0'}}:{})};
 });
 const fail=jest.fn(),locale=new LocaleState({read:async()=>null,write:async()=>{}});
 render(<LocaleProvider manager={locale}><RecoveryPanel client={{request:request as never}} domain={domain} fail={fail}/></LocaleProvider>);return {request,fail};
}
test('admin queue exposes older pending pages, verifies evidence and sends canonical decision with stable retry key',async()=>{
 const f=mount();await screen.findByRole('button',{name:'CASE-A · Chờ duyệt'});fireEvent.press(screen.getByRole('button',{name:'Xem thêm'}));await screen.findByRole('button',{name:'CASE-B · Chờ duyệt'});expect(f.request).toHaveBeenCalledWith('/admin/recovery-reports?state=pending&cursor=next',expect.any(Function));
 fireEvent.press(screen.getByRole('button',{name:'CASE-A · Chờ duyệt'}));await screen.findByText('DEMO ownership evidence');fireEvent.changeText(screen.getByLabelText('Lý do quyết định'),'checked applicant evidence');expect(screen.getByRole('button',{name:'Duyệt'})).toBeDisabled();fireEvent.press(screen.getByRole('checkbox'));fireEvent.press(screen.getByRole('button',{name:'Duyệt'}));await waitFor(()=>expect(f.request.mock.calls.some(c=>c[0].endsWith('/decision'))).toBe(true));
 const decision=f.request.mock.calls.find(c=>c[0].endsWith('/decision'))!;expect(decision[2]).toEqual({decision:'approve',reason:'checked applicant evidence',expected_version:1});expect(decision[3]).toMatch(/^[a-f0-9-]{36}$/);
});
test('deletion approval remains disabled when rechecked detail has pending obligations',async()=>{
 mount('account-deletions');fireEvent.press(await screen.findByRole('button',{name:'CASE-A · Chờ duyệt'}));await screen.findByText('0 POINT · Công việc chưa xong');fireEvent.changeText(screen.getByLabelText('Lý do quyết định'),'checked obligations');fireEvent.press(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Duyệt'})).toBeDisabled();expect(screen.getByRole('button',{name:'Từ chối'})).not.toBeDisabled();
});

test('uncertain approval has an explicit frozen retry and cannot be submitted through Reject',async()=>{
 const f=mount();fireEvent.press(await screen.findByRole('button',{name:'CASE-A · Chờ duyệt'}));await screen.findByText('DEMO ownership evidence');fireEvent.changeText(screen.getByLabelText('Lý do quyết định'),'verified ownership');fireEvent.press(screen.getByRole('checkbox'));
 f.request.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByRole('button',{name:'Duyệt'}));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Từ chối'})).toBeDisabled();const retry=screen.getByRole('button',{name:'Thử lại: Duyệt'});fireEvent.press(screen.getByRole('button',{name:'Từ chối'}));expect(f.request.mock.calls.filter(c=>c[0].endsWith('/decision'))).toHaveLength(1);fireEvent.press(retry);await waitFor(()=>expect(f.request.mock.calls.filter(c=>c[0].endsWith('/decision'))).toHaveLength(2));const calls=f.request.mock.calls.filter(c=>c[0].endsWith('/decision'));expect(calls[0]).toEqual(calls[1]);
});
