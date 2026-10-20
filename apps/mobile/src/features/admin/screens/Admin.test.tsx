import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {AppState,type AppStateStatus} from 'react-native';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AppNavigator} from '../../../app/navigation/AppNavigator';
import {authFixture,session} from '../../../../test/helpers/auth';
import {AdminApi} from '../api/admin-api';
import {ApiError} from '../../../lib/http/api-error';
import type {Item} from '../models';
jest.mock('../../search/screens/SearchScreen',()=>({SearchScreen:()=>null}));
const grants=['support.read','support.manage','moderation.manage','audit.read'];
const report:Item={id:'report',version:1,subject:'DEMO support',body:'DEMO body',state:'open',evidence_ids:[],updates:[],history:[]};
const verification:Item={id:'verify',version:1,partner_name:'DEMO partner',state:'pending',details:{kind:'identity',statement:'DEMO statement'},document_asset_ids:['photo'],history:[]};
const review:Item={id:'review',version:1,stars:4,body:'DEMO review',hidden:false,removed:false,history:[]};
function fixture(permissions=grants){
 const f=authFixture('saved');const user={...session.user,admin_permissions:permissions};
 f.api.refresh.mockResolvedValue({...session,user});f.api.me.mockResolvedValue(user);
 const status=jest.spyOn(AdminApi.prototype,'status').mockResolvedValue(true);
 const verify=jest.spyOn(AdminApi.prototype,'verify').mockResolvedValue(undefined);
 jest.spyOn(AdminApi.prototype,'expiresAt','get').mockReturnValue(Date.now()+900000);
 const enroll=jest.spyOn(AdminApi.prototype,'enroll').mockResolvedValue({secret:'DEMO-SECRET',uri:'demo'});
 const page=jest.spyOn(AdminApi.prototype,'page').mockImplementation(async d=>({items:[d==='reports'?report:d==='verifications'?verification:review],next_cursor:null}));
 const item=jest.spyOn(AdminApi.prototype,'item').mockImplementation(async d=>d==='reports'?report:d==='verifications'?verification:review);
 const decision=jest.spyOn(AdminApi.prototype,'decision').mockResolvedValue({...report,version:2,state:'reviewing',history:[{action:'reviewing',reason:'DEMO reason',created_at:'2026-10-19T00:00:00Z',version:2,actor_id:'admin'}]});
 const audit=jest.spyOn(AdminApi.prototype,'audit').mockResolvedValue({items:[{id:'a',domain:'reports',resource_id:'report',actor_id:'admin',action:'reviewing',reason:'DEMO audit',version:2,created_at:'2026-10-19T00:00:00Z'}],next_cursor:null});
 const lock=jest.spyOn(AdminApi.prototype,'lock').mockResolvedValue(undefined);
 jest.spyOn(AdminApi.prototype,'photo').mockResolvedValue('data:image/png;base64,ZGVtbw==');
 return {...f,status,verify,enroll,page,item,decision,audit,lock};
}
function mount(f:ReturnType<typeof fixture>){render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><AppNavigator/></AuthProvider></AppProviders>);}
async function enter(){await screen.findByTestId('admin-password');fireEvent.changeText(screen.getByTestId('admin-password'),'DEMO password');fireEvent.changeText(screen.getByTestId('admin-code'),'123456');fireEvent.press(screen.getByTestId('admin-verify'));await screen.findByTestId('admin-queue');await waitFor(()=>expect(screen.getByTestId('admin-search-submit')).toBeEnabled());}
afterEach(()=>{jest.restoreAllMocks();jest.mocked(AppState.addEventListener).mockImplementation(()=>({remove:jest.fn()}));});
test('admin login routes to a dedicated mobile console and never renders customer tabs; lock removes private data',async()=>{
 const f=fixture();mount(f);await enter();expect(screen.queryByTestId('nav-catalog')).toBeNull();expect(screen.queryByTestId('nav-jobs')).toBeNull();expect(screen.queryByTestId('nav-messages')).toBeNull();
 fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByText('DEMO body');expect(screen.queryByTestId('admin-queue')).toBeNull();
 fireEvent.changeText(screen.getByTestId('admin-reason'),'DEMO reason');fireEvent.press(screen.getByTestId('admin-save'));await screen.findByText('Đã lưu quyết định và nhật ký.');
 expect(f.decision).toHaveBeenCalledWith('reports','report',{expected_version:1,state:'reviewing',reason:'DEMO reason'},expect.any(String));
 fireEvent.press(screen.getByTestId('admin-lock'));await screen.findByTestId('admin-password');expect(screen.queryByText('DEMO body')).toBeNull();expect(f.lock).toHaveBeenCalled();
 fireEvent.press(screen.getByTestId('admin-logout'));await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));expect(screen.queryByTestId('admin-root')).toBeNull();
});
test('mobile admin retries the exact decision after a lost response and reloads a conflicting version',async()=>{
 const f=fixture();f.decision.mockRejectedValueOnce(new ApiError('NETWORK')).mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));mount(f);await enter();fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByTestId('admin-reason');
 fireEvent.changeText(screen.getByTestId('admin-reason'),'DEMO retry');fireEvent.press(screen.getByTestId('admin-save'));await screen.findByText('Chưa xác nhận được kết quả. Giữ nguyên nội dung để thử lại.');expect(screen.getByTestId('admin-reason')).toHaveProp('editable',false);
 fireEvent.press(screen.getByTestId('admin-save'));await screen.findByText('Hồ sơ đã thay đổi. Tải lại dữ liệu để xem trước khi quyết định.');expect(f.decision.mock.calls[0]).toEqual(f.decision.mock.calls[1]);
 f.item.mockResolvedValueOnce({...report,version:3});fireEvent.press(screen.getByText('Tải lại dữ liệu'));await waitFor(()=>expect(screen.getByTestId('admin-reason')).toHaveProp('value',''));
});
test('mobile admin filters queues, reviews private verification evidence, moderates reviews and reads audit',async()=>{
 const f=fixture();mount(f);await enter();fireEvent.changeText(screen.getByTestId('admin-search'),'DEMO');fireEvent.press(screen.getByTestId('admin-filter'));fireEvent.press(screen.getByTestId('admin-filter-open'));fireEvent.press(screen.getByTestId('admin-search-submit'));await waitFor(()=>expect(f.page).toHaveBeenLastCalledWith('reports','DEMO','open',undefined));
 fireEvent.press(screen.getByTestId('admin-tab-verifications'));fireEvent.press(await screen.findByTestId('admin-item-verify'));await screen.findByLabelText('Ảnh chứng cứ');fireEvent.press(screen.getByTestId('admin-action'));fireEvent.press(screen.getByTestId('admin-action-approve'));fireEvent.changeText(screen.getByTestId('admin-reason'),'DEMO checked');expect(screen.getByTestId('admin-save')).toBeDisabled();fireEvent(screen.getByTestId('admin-checked'),'valueChange',true);
 f.decision.mockResolvedValueOnce({...verification,version:2,state:'approved'});fireEvent.press(screen.getByTestId('admin-save'));await screen.findByText('Hồ sơ này chỉ đọc.');
 fireEvent.press(screen.getByTestId('admin-close-detail'));await screen.findByTestId('admin-queue');fireEvent.press(screen.getByTestId('admin-tab-reviews'));fireEvent.press(await screen.findByTestId('admin-item-review'));await screen.findByText('DEMO review');fireEvent.press(screen.getByTestId('admin-action'));fireEvent.press(screen.getByTestId('admin-action-hide'));fireEvent.changeText(screen.getByTestId('admin-reason'),'DEMO hidden');f.decision.mockResolvedValueOnce({...review,hidden:true,version:2});fireEvent.press(screen.getByTestId('admin-save'));await screen.findByText('Đang ẩn');
 fireEvent.press(screen.getByTestId('admin-tab-audit'));await screen.findByText('DEMO audit');
});
test('admin setup requires confirmation and backgrounding clears the MFA secret and console',async()=>{
 const f=fixture();f.status.mockResolvedValue(false);let onChange:((s:AppStateStatus)=>void)|undefined;jest.spyOn(AppState,'addEventListener').mockImplementation((type,listener)=>{if(type==='change')onChange=listener;return {remove:jest.fn()};});mount(f);await screen.findByTestId('admin-password');
 fireEvent.changeText(screen.getByTestId('admin-password'),'DEMO password');fireEvent.press(screen.getByTestId('admin-verify'));await screen.findByText('DEMO-SECRET');
 act(()=>onChange?.('background'));await waitFor(()=>expect(screen.queryByText('DEMO-SECRET')).toBeNull());expect(screen.getByTestId('admin-password')).toHaveProp('value','');
 fireEvent.changeText(screen.getByTestId('admin-password'),'DEMO password');fireEvent.changeText(screen.getByTestId('admin-code'),'123456');fireEvent.press(screen.getByTestId('admin-verify'));await screen.findByTestId('admin-queue');expect(f.enroll).toHaveBeenCalledTimes(1);expect(f.verify).toHaveBeenCalledWith('DEMO password','123456',true);
});
test('support read-only grants cannot decide and revoked MFA clears the loaded record',async()=>{
 const f=fixture(['support.read']);mount(f);await enter();expect(screen.queryByTestId('admin-tab-reviews')).toBeNull();fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByText('Không có quyền đổi trạng thái báo cáo.');expect(screen.queryByTestId('admin-save')).toBeNull();fireEvent.press(screen.getByTestId('admin-close-detail'));f.item.mockRejectedValueOnce(new ApiError('FORBIDDEN'));fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByTestId('admin-password');expect(screen.queryByTestId('admin-detail')).toBeNull();
});
test('completion controls require the separate finance grant and do not grant support decisions',async()=>{
 const f=fixture(['support.read','finance.review']);f.item.mockResolvedValue({...report,invoice_id:'i',evidence_ids:['photo']});mount(f);await enter();fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByTestId('completion-preview');expect(screen.queryByTestId('admin-save')).toBeNull();
});
test('support read access alone cannot display completion controls',async()=>{
 const f=fixture(['support.read']);f.item.mockResolvedValue({...report,invoice_id:'i',evidence_ids:['photo']});mount(f);await enter();fireEvent.press(screen.getByTestId('admin-item-report'));await screen.findByText('DEMO body');expect(screen.queryByTestId('completion-preview')).toBeNull();
});
