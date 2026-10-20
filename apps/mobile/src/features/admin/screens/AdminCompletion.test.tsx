import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {AppProviders} from '../../../app/providers/AppProviders';
import {ApiError} from '../../../lib/http/api-error';
import {AdminCompletion} from './AdminCompletion';
import {translator} from '../messages';
import type {AdminApi} from '../api/admin-api';
import type {Item,CompletionPreview} from '../models';
const item:Item={id:'report',invoice_id:'invoice',version:2,state:'open',evidence_ids:['photo'],updates:[],history:[]};
const p:CompletionPreview={invoice_id:'invoice',invoice_version_id:'v1',invoice_expected_version:4,total:'150000',cash_due:'100000',points_used:'50000',fee:'10000',reward:'1333',partner_delta:'40000',preview_token:'private-preview',expires_at:'2099-01-01T00:00:00Z'};
function fixture(preview={...p,expires_at:new Date(Date.now()+300000).toISOString()}){const client={completionPreview:jest.fn().mockResolvedValue(preview),complete:jest.fn().mockResolvedValue({settlement_id:'settled',actor_kind:'admin',invoice:{id:'invoice',settled:true,review_eligible:false}})},reload=jest.fn(),fail=jest.fn();render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AdminCompletion item={item} client={client as unknown as AdminApi} t={translator('vi')} locale="vi" fail={fail} reload={reload}/></AppProviders>);return {client,reload,fail};}
async function fill(){fireEvent.press(screen.getByTestId('completion-preview'));await screen.findByTestId('completion-confirm');expect(screen.getByTestId('completion-confirm')).toBeDisabled();fireEvent.changeText(screen.getByTestId('completion-reason'),'DEMO checked');fireEvent(screen.getByTestId('completion-checked'),'valueChange',true);}
test('completion displays amounts, requires evidence confirmation and retries the captured request after a lost response',async()=>{
 const f=fixture();f.client.complete.mockRejectedValueOnce(new ApiError('NETWORK'));await fill();expect(screen.getByText('150.000 ₫')).toBeTruthy();fireEvent.press(screen.getByTestId('completion-confirm'));await screen.findByText('Chưa xác nhận được kết quả. Giữ nguyên nội dung để thử lại.');expect(screen.getByTestId('completion-reason')).toHaveProp('editable',false);
 fireEvent.press(screen.getByTestId('completion-confirm'));await waitFor(()=>expect(f.reload).toHaveBeenCalledTimes(1));expect(f.client.complete.mock.calls[0]).toEqual(f.client.complete.mock.calls[1]);expect(f.client.complete).toHaveBeenCalledWith('report',{expected_version:2,invoice_id:'invoice',invoice_version_id:'v1',invoice_expected_version:4,reason:'DEMO checked',evidence_ids:['photo'],preview_token:'private-preview',checked:true},expect.any(String));
});
test('completion conflict forces a reload and expired previews cannot submit',async()=>{
 const f=fixture();f.client.complete.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));await fill();fireEvent.press(screen.getByTestId('completion-confirm'));await screen.findByText('Hồ sơ đã thay đổi. Tải lại dữ liệu để xem trước khi quyết định.');expect(screen.queryByTestId('completion-confirm')).toBeNull();fireEvent.press(screen.getByText('Tải lại dữ liệu'));expect(f.reload).toHaveBeenCalled();
});
test('completion expires without sending a decision',async()=>{
 jest.useFakeTimers();try{const f=fixture({...p,expires_at:new Date(Date.now()+1000).toISOString()});fireEvent.press(screen.getByTestId('completion-preview'));await act(async()=>{});act(()=>jest.advanceTimersByTime(1001));expect(screen.getByText('Bản xem trước hết hạn. Tải lại dữ liệu để kiểm tra.')).toBeTruthy();expect(screen.queryByTestId('completion-confirm')).toBeNull();expect(f.client.complete).not.toHaveBeenCalled();}finally{jest.useRealTimers();}
});
test('completion rejects an MFA failure without sending a decision',async()=>{
 const f=fixture();f.client.completionPreview.mockRejectedValueOnce(new ApiError('REAUTH_REQUIRED'));fireEvent.press(screen.getByTestId('completion-preview'));await waitFor(()=>expect(f.fail).toHaveBeenCalled());expect(f.client.complete).not.toHaveBeenCalled();
});
