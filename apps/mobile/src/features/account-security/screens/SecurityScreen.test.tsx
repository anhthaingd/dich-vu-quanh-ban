import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {View as MockView} from 'react-native';
import {SecurityScreen} from './SecurityScreen';
import {RecoveryScreen} from './RecoveryScreen';
import {LocaleProvider} from '../../../app/providers/LocaleProvider';
import {LocaleState} from '../../../lib/i18n/locale-state';
const mockApi={challenge:jest.fn(),login:jest.fn(),confirm:jest.fn(),password:jest.fn(),preview:jest.fn(),deletion:jest.fn(),recover:jest.fn(),status:jest.fn(),supplement:jest.fn(),recoveryChallenge:jest.fn()};
const mockManager={featureOperation:jest.fn((_owner,work)=>work('TOKEN')),logout:jest.fn(),loadProfile:jest.fn(),loginWithCode:jest.fn(async work=>{await work();}),getSnapshot:jest.fn(()=>({phase:'authenticated'}))};
let mockOwner:string|undefined='owner-A';
jest.mock('../api/security-api',()=>({createSecurityApi:()=>new Proxy({}, {get:(_target,key)=>mockApi[key as keyof typeof mockApi]})}));
jest.mock('../../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:mockManager,state:{user:mockOwner?{id:mockOwner,version:1}:null}})}));
jest.mock('../../../app/layout/ProductShell',()=>({ProductShell:({children}:{children:React.ReactNode})=><MockView>{children}</MockView>}));
function mount(recovery=false){const locale=new LocaleState({read:async()=>null,write:async()=>{}});return render(<LocaleProvider manager={locale}>{recovery?<RecoveryScreen back={jest.fn()}/>:<SecurityScreen back={jest.fn()} recovery={jest.fn()}/>}</LocaleProvider>);}
beforeEach(()=>{jest.clearAllMocks();mockOwner='owner-A';});
test('password form waits for server before logging out and clears secrets',async()=>{
 mockApi.password.mockResolvedValue({id:'A',version:1,state:'completed'});mount();
 fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'),'current-password');fireEvent.changeText(screen.getByLabelText('Mật khẩu mới (8–128 ký tự)'),'new-password-long-enough');
 fireEvent.press(screen.getByRole('button',{name:'Xác nhận'}));await waitFor(()=>expect(mockManager.logout).toHaveBeenCalled());expect(mockApi.password).toHaveBeenCalledWith('TOKEN','current-password','new-password-long-enough');expect(screen.getByLabelText('Mật khẩu hiện tại').props.value).toBe('');
});
test('identity sends fresh password proof then confirms code with the active owner',async()=>{
 mockApi.challenge.mockResolvedValue({id:'challenge-A',expires_at:'2099-01-01',resend_after_seconds:60});mockApi.confirm.mockResolvedValue({id:'A',version:1,state:'completed'});mount();
 fireEvent.press(screen.getByTestId('security-mode-identity'));fireEvent.changeText(screen.getByLabelText('Email hoặc số điện thoại'),'new@example.test');fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'),'fresh-password');fireEvent.press(screen.getByRole('button',{name:'Gửi mã DEMO'}));
 await screen.findByLabelText('Mã 6 chữ số');expect(mockApi.challenge).toHaveBeenCalledWith('identity','new@example.test','TOKEN','fresh-password',1,expect.any(String));expect(screen.getByLabelText('Mật khẩu hiện tại').props.value).toBe('');fireEvent.changeText(screen.getByLabelText('Mã 6 chữ số'),'123456');fireEvent.press(screen.getByRole('button',{name:'Xác nhận'}));await waitFor(()=>expect(mockManager.loadProfile).toHaveBeenCalledWith('owner-A'));
});
test('deletion needs preview and explicit point-forfeiture checkbox',async()=>{
 mockApi.preview.mockResolvedValue({blocked:true,reasons:['BALANCE'],points:'100'});mockApi.deletion.mockResolvedValue({id:'D',state:'pending',version:1});mount();fireEvent.press(screen.getByTestId('security-mode-delete'));fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'),'fresh-password');fireEvent.changeText(screen.getByLabelText('Lý do yêu cầu xóa'),'Remove my DEMO account');fireEvent.press(screen.getByRole('button',{name:'Kiểm tra nghĩa vụ'}));await screen.findByText('Point còn lại: 100');expect(screen.getByTestId('security-delete-confirm')).toBeDisabled();fireEvent.press(screen.getByRole('checkbox'));fireEvent.press(screen.getByTestId('security-delete-confirm'));await waitFor(()=>expect(mockApi.deletion).toHaveBeenCalledWith('TOKEN','fresh-password',true,1,'Remove my DEMO account'));
});

test('code resend follows the server delay and an expired or nonnumeric code cannot be confirmed',async()=>{
 jest.useFakeTimers();mockOwner=undefined;mockApi.challenge.mockResolvedValue({id:'C',expires_at:new Date(Date.now()+120000).toISOString(),resend_after_seconds:20});
 try{
  mount();fireEvent.changeText(screen.getByLabelText('Email hoặc số điện thoại'),'demo@example.test');fireEvent.press(screen.getByRole('button',{name:'Gửi mã DEMO'}));
  await screen.findByLabelText('Mã 6 chữ số');expect(screen.getByTestId('security-resend')).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Mã 6 chữ số'),'abcdef');expect(screen.getByTestId('security-code-confirm')).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Mã 6 chữ số'),'123456');expect(screen.getByTestId('security-code-confirm')).toBeEnabled();
  act(()=>jest.advanceTimersByTime(21000));expect(screen.getByTestId('security-resend')).toBeEnabled();
  act(()=>jest.advanceTimersByTime(100000));expect(screen.getByTestId('security-code-confirm')).toBeDisabled();expect(screen.getByText('Mã đã hết hạn. Hãy gửi lại mã để tiếp tục.')).toBeTruthy();expect(mockApi.login).not.toHaveBeenCalled();
 }finally{jest.useRealTimers();}
});

test('changing security mode discards the deletion preview and previous point-forfeiture consent',async()=>{
 mockApi.preview.mockResolvedValue({blocked:true,reasons:['BALANCE'],points:'100'});mount();fireEvent.press(screen.getByTestId('security-mode-delete'));fireEvent.press(screen.getByRole('button',{name:'Kiểm tra nghĩa vụ'}));await screen.findByRole('checkbox');fireEvent.press(screen.getByRole('checkbox'));
 fireEvent.press(screen.getByTestId('security-mode-password'));fireEvent.press(screen.getByTestId('security-mode-delete'));expect(screen.queryByTestId('security-delete-confirm')).toBeNull();
 fireEvent.press(screen.getByRole('button',{name:'Kiểm tra nghĩa vụ'}));await screen.findByRole('checkbox');expect(screen.getByRole('checkbox')).toHaveProp('accessibilityState',expect.objectContaining({checked:false}));expect(mockApi.deletion).not.toHaveBeenCalled();
});
test('public recovery does not log in after submission or admin approval; applicant must verify',async()=>{
 mockOwner=undefined;mockApi.recover.mockResolvedValue({id:'R',receipt_token:'secret-receipt',state:'pending',version:1});mockApi.status.mockResolvedValue({id:'R',state:'approved',version:2});mockApi.recoveryChallenge.mockResolvedValue({id:'C',expires_at:'2099-01-01',resend_after_seconds:60});mount(true);
 fireEvent.changeText(screen.getByLabelText('Liên hệ cũ'),'old@example.test');fireEvent.changeText(screen.getByLabelText('Liên hệ mới'),'new@example.test');fireEvent.changeText(screen.getByLabelText('Thông tin chứng minh tài khoản'),'evidence');fireEvent.press(screen.getByRole('button',{name:'Gửi hồ sơ'}));await waitFor(()=>expect(screen.getByLabelText('Mã hồ sơ').props.value).toBe('R'));fireEvent.press(screen.getByRole('button',{name:'Tra cứu hồ sơ'}));await screen.findByText('Admin cho phép xác minh kênh mới. Bước này chưa đăng nhập.');expect(mockManager.loginWithCode).not.toHaveBeenCalled();fireEvent.press(screen.getByRole('button',{name:'Gửi mã DEMO'}));await screen.findByLabelText('Mã 6 chữ số');expect(mockApi.recoveryChallenge).toHaveBeenCalledWith('R','secret-receipt');
});
