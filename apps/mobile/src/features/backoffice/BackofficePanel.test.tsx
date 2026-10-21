import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {BackofficePanel} from './BackofficePanel';
import {AdminApi} from '../admin/api/admin-api';
import {ApiError} from '../../lib/http/api-error';
const target={id:'target',name:'DEMO target',version:1,permissions:[],status:'active'};
function client(){const request=jest.fn().mockResolvedValue({items:[target],next_cursor:null});return {request} as unknown as AdminApi;}
test('admin permission form preserves retry input and key after lost response and cannot edit beyond held grants',async()=>{
 const api=client(),request=jest.mocked(api.request),fail=jest.fn();render(<BackofficePanel client={api} mode="grants" locale="vi" grants={['grant.manage','reports.read']} owner="admin" fail={fail}/>);
 await screen.findByText('DEMO target');request.mockResolvedValueOnce(target);fireEvent.press(screen.getByText('DEMO target'));
 const checkbox=await screen.findByLabelText('☐ reports.read');expect(screen.getByLabelText('☐ finance.review')).toBeDisabled();fireEvent.press(checkbox);fireEvent.changeText(screen.getByTestId('office-reason'),'DEMO reason');
 request.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('office-save'));await screen.findByText('Thử lại cùng thao tác');expect(screen.getByTestId('office-reason')).toHaveProp('editable',false);
 const first=request.mock.calls.at(-1);request.mockResolvedValueOnce({...target,version:2,permissions:['reports.read']});fireEvent.press(screen.getByTestId('office-save'));await screen.findByText('Lưu quyền');expect(request.mock.calls.at(-1)).toEqual(first);expect(await screen.findByLabelText('☑ reports.read')).toBeTruthy();expect(screen.queryByText('Không hoàn tất. Kiểm tra quyền hoặc tải dữ liệu mới rồi thử lại.')).toBeNull();

});
test('metrics keeps exact large money and ignores a response after unmount',async()=>{
 const api=client(),request=jest.mocked(api.request);let resolve!:(v:unknown)=>void;request.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const mounted=render(<BackofficePanel client={api} mode="metrics" locale="en" grants={['reports.read']} owner="admin" fail={jest.fn()}/>);mounted.unmount();await act(async()=>{resolve({items:[{name:'fee_settled',value:'90071992547409931',unit:'VND'}]});});
 request.mockResolvedValue({items:[{name:'fee_settled',value:'90071992547409931',unit:'VND'}]});render(<BackofficePanel client={api} mode="metrics" locale="en" grants={['reports.read']} owner="admin" fail={jest.fn()}/>);expect(await screen.findByText('90,071,992,547,409,931 VND')).toBeTruthy();
});
