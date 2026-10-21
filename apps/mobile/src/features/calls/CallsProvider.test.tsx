import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {CallsProvider,CallButton} from './CallsProvider';
import {CallHistory} from './CallHistory';
import type {CallsApi} from './api/calls-api';
import {ApiError} from '../../lib/http/api-error';
import type {Call,MediaToken} from './models';
let mockOwner:string|undefined='recipient';
const mockOperation=jest.fn(async (_owner:string,work:(token:string)=>Promise<unknown>)=>work('test-token'));
const mockManager={featureOperation:mockOperation};
jest.mock('../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:mockManager,state:{phase:mockOwner?'authenticated':'anonymous',user:mockOwner?{id:mockOwner,status:'active'}:null,busy:false}})}));
jest.mock('../../app/providers/LocaleProvider',()=>({useLocale:()=>({locale:'vi'})}));
jest.mock('../../app/providers/RealtimeProvider',()=>({useRealtime:()=>null}));
const mockPrepare=jest.fn(),mockConnect=jest.fn(),mockMute=jest.fn(),mockSpeaker=jest.fn(),mockClose=jest.fn(),mockResume=jest.fn();
jest.mock('./media',()=>({prepareMicrophone:()=>mockPrepare(),createMediaSession:()=>({supportsSpeaker:true,connect:mockConnect,mute:mockMute,speaker:mockSpeaker,close:mockClose,resume:mockResume})}));
const call:Call={id:'call1',job_id:'job1',conversation_id:'room1',caller_id:'caller',recipient_id:'recipient',state:'ringing',version:1,created_at:'2026-10-21T00:00:00Z',ring_until:'2099-01-01T00:00:00Z',answered_at:null,ended_at:null};
let api:jest.Mocked<CallsApi>;
const flush=async()=>{await act(async()=>{});};
beforeEach(()=>{jest.useFakeTimers();mockOwner='recipient';for(const f of [mockOperation,mockPrepare,mockConnect,mockMute,mockSpeaker,mockClose,mockResume])f.mockClear();mockPrepare.mockResolvedValue(undefined);mockClose.mockResolvedValue(undefined);mockMute.mockResolvedValue(undefined);mockSpeaker.mockResolvedValue(undefined);mockConnect.mockImplementation(async(_c,status)=>{status('connected');});
 api={targets:jest.fn().mockResolvedValue({items:[{user_id:'recipient',display_name:'DEMO thợ',role:'assigned'}]}),create:jest.fn().mockResolvedValue(call),list:jest.fn().mockResolvedValue({items:[call],next_cursor:null}),get:jest.fn().mockResolvedValue(call),action:jest.fn().mockImplementation(async(_t,c,a)=>({...c,state:a==='accept'?'accepted':a==='decline'?'declined':a==='fail'?'failed':'ended',version:c.version+1})),media:jest.fn().mockResolvedValue({call_id:'call1',url:'ws://127.0.0.1:7880',token:'test-media-token-only',expires_at:'2099-01-01T00:00:00Z'}),heartbeat:jest.fn().mockResolvedValue(call)};
});
afterEach(()=>{jest.useRealTimers();});
test('incoming recipient accepts, enables media and actual controls, then closes tracks when ending',async()=>{
 render(<CallsProvider api={api}/>);await flush();expect(screen.getByTestId('call-state')).toHaveTextContent('Đang chờ trả lời');
 fireEvent.press(screen.getByTestId('call-accept'));await flush();expect(mockPrepare).toHaveBeenCalledTimes(1);expect(api.action).toHaveBeenCalledWith('test-token',call,'accept',expect.any(String));expect(mockConnect).toHaveBeenCalledTimes(1);expect(screen.getByTestId('call-state')).toHaveTextContent('Đang trò chuyện');
 fireEvent.press(screen.getByTestId('call-mute'));await flush();expect(mockMute).toHaveBeenCalledWith(true);
 fireEvent.press(screen.getByTestId('call-speaker'));await flush();expect(mockSpeaker).toHaveBeenCalledWith(true);
 fireEvent.press(screen.getByTestId('call-end'));await flush();expect(api.action.mock.calls.at(-1)![2]).toBe('end');expect(mockClose).toHaveBeenCalled();expect(screen.getByTestId('call-state')).toHaveTextContent('Đã kết thúc');
});
test('uncertain acceptance retries same version and idempotency key',async()=>{
 api.action.mockRejectedValueOnce(new ApiError('TIMEOUT'));render(<CallsProvider api={api}/>);await flush();fireEvent.press(screen.getByTestId('call-accept'));await flush();const first=api.action.mock.calls[0];expect(screen.getByTestId('call-retry')).toBeTruthy();fireEvent.press(screen.getByTestId('call-retry'));await flush();expect(api.action.mock.calls[1]).toEqual(first);expect(mockConnect).toHaveBeenCalledTimes(1);
});
test('malformed committed action response preserves its exact retry key and version',async()=>{
 api.action.mockRejectedValueOnce(new ApiError('INVALID_RESPONSE'));render(<CallsProvider api={api}/>);await flush();fireEvent.press(screen.getByTestId('call-accept'));await flush();const first=api.action.mock.calls[0];expect(screen.getByTestId('call-retry')).toBeTruthy();expect(screen.getByTestId('call-accept')).toBeDisabled();fireEvent.press(screen.getByTestId('call-retry'));await flush();expect(api.action.mock.calls[1]).toEqual(first);expect(mockConnect).toHaveBeenCalledTimes(1);
});
test('microphone denial never accepts or joins and caller can start only an eligible target',async()=>{
 mockPrepare.mockRejectedValueOnce(new Error('denied'));render(<CallsProvider api={api}/>);await flush();fireEvent.press(screen.getByTestId('call-accept'));await flush();expect(api.action).not.toHaveBeenCalled();expect(api.media).not.toHaveBeenCalled();expect(screen.getByText(/Cần cho phép micro/)).toBeTruthy();
});
test('switching account drops late media credentials and ends native audio lifecycle',async()=>{
 let finish!:(v:MediaToken)=>void;api.media.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const view=render(<CallsProvider api={api}/>);await flush();fireEvent.press(screen.getByTestId('call-accept'));await flush();mockOwner=undefined;view.rerender(<CallsProvider api={api}/>);await flush();await act(async()=>finish({call_id:'call1',token:'test',url:'ws://127.0.0.1',expires_at:'2099-01-01'}));expect(mockConnect).not.toHaveBeenCalled();expect(mockClose).toHaveBeenCalled();expect(screen.queryByTestId('call-accept')).toBeNull();
});
test('media disconnect marks failure and polling cannot keep a dead media call accepted',async()=>{
 mockConnect.mockImplementationOnce(async(_c,status)=>{status('failed');});render(<CallsProvider api={api}/>);await flush();fireEvent.press(screen.getByTestId('call-accept'));await flush();expect(api.action.mock.calls.at(-1)![2]).toBe('fail');expect(screen.getByTestId('call-state')).toHaveTextContent('Kết nối thất bại');
});
test('call button starts an outgoing call, while history retries an empty failed first page',async()=>{
 mockOwner='caller';api.list.mockResolvedValue({items:[],next_cursor:null});const view=render(<CallsProvider api={api}><CallButton jobId="job1"/></CallsProvider>);await flush();fireEvent.press(screen.getByTestId('call-target-assigned'));await flush();expect(api.create).toHaveBeenCalledWith('test-token','job1','recipient',expect.any(String));expect(screen.queryByTestId('call-accept')).toBeNull();view.unmount();
 let historyReads=0;api.list.mockImplementation(async(_t,q)=>{if(q?.conversation_id&&++historyReads===1)throw new ApiError('NETWORK');return {items:[],next_cursor:null};});render(<CallsProvider api={api}><CallHistory conversationId="room1"/></CallsProvider>);await flush();fireEvent.press(screen.getByText('Thử lại'));await flush();expect(historyReads).toBe(2);expect(screen.getByText('Chưa có cuộc gọi')).toBeTruthy();
});
test('peer label uses current contact name and fences late names across account and call changes',async()=>{
 let finishOld!:(v:{items:{user_id:string;display_name:string;role:'customer'}[]})=>void;
 api.targets.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}));
 const view=render(<CallsProvider api={api}/>);await flush();expect(screen.getByText('Người gọi: Người liên hệ')).toBeTruthy();expect(screen.queryByText('Người gọi: caller')).toBeNull();
 const next={...call,id:'call-next',caller_id:'caller',recipient_id:'new-peer'};mockOwner='caller';api.list.mockResolvedValue({items:[next],next_cursor:null});api.targets.mockResolvedValue({items:[{user_id:'new-peer',display_name:'DEMO Người mới',role:'contact'}]});view.rerender(<CallsProvider api={api}/>);await flush();expect(screen.getByText('Người nhận: DEMO Người mới')).toBeTruthy();
 await act(async()=>finishOld({items:[{user_id:'caller',display_name:'DEMO Người cũ',role:'customer'}]}));expect(screen.getByText('Người nhận: DEMO Người mới')).toBeTruthy();expect(screen.queryByText(/DEMO Người cũ/)).toBeNull();expect(screen.queryByText('Người nhận: new-peer')).toBeNull();
});
