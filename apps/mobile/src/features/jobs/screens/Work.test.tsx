import {Fragment} from 'react';
import {RealtimeProvider} from '../../../app/providers/RealtimeProvider';
import {ScrollView} from 'react-native';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppState, type AppStateStatus} from 'react-native';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {JobsScreen} from './JobsScreen';
import {JobDetailScreen} from './JobDetailScreen';
import {JobCreateScreen} from './JobCreateScreen';
import {ConversationsScreen} from '../../chat/screens/ConversationsScreen';
import {PartnerProfileScreen} from '../../partners/screens/PartnerProfileScreen';
import {ConversationScreen} from '../../chat/screens/ConversationScreen';
import {workFixture,job,message,room} from '../../../../test/helpers/work';
import {ApiError} from '../../../lib/http/api-error';
jest.mock('../../location/components/LocationField',()=>({LocationField:({onChange}:{onChange:(v:unknown)=>void})=>{const {Button}=jest.requireActual('../../../components/ui/Button');return <Button testID="test-place" label="DEMO place" onPress={()=>onChange({text:'DEMO place',point:{latitude:21,longitude:105},source:'saved'})}/>;}}));
const Stack=createNativeStackNavigator<RootStackParamList>();
function mount(f:ReturnType<typeof workFixture>,initial: 'Jobs'|'JobDetail'|'JobCreate'|'Conversations'|'Conversation'|'PartnerProfile'='Jobs',realtime=false){
 const RefreshProvider=realtime?RealtimeProvider:Fragment;
 return render(<AppProviders api={{categories:jest.fn().mockResolvedValue([]),skills:jest.fn().mockResolvedValue([])}}><AuthProvider manager={f.manager}><RefreshProvider><NavigationContainer><Stack.Navigator initialRouteName={initial} screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="PartnerProfile" component={PartnerProfileScreen} initialParams={{id:'partner'}}/><Stack.Screen name="Jobs" component={JobsScreen}/><Stack.Screen name="JobDetail" component={JobDetailScreen} initialParams={{id:'job'}}/><Stack.Screen name="JobCreate" component={JobCreateScreen} initialParams={{partnerId:'partner'}}/><Stack.Screen name="Conversations" component={ConversationsScreen} initialParams={{jobId:'job'}}/><Stack.Screen name="Conversation" component={ConversationScreen} initialParams={{id:'room',jobId:'job'}}/></Stack.Navigator></NavigationContainer></RefreshProvider></AuthProvider></AppProviders>);
}
async function refreshDone(){await waitFor(()=>expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.accessibilityState.busy).toBe(false));}
function pull(){act(()=>screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh());}
async function enabled(id:string){await waitFor(()=>expect(screen.getByTestId(id)).not.toBeDisabled());}
test('job list switches scope, paginates, recovers an error and opens details and related chat',async()=>{
 const f=workFixture();f.jobs.list.mockResolvedValueOnce({items:[job],next_cursor:'next'}).mockResolvedValueOnce({items:[{...job,id:'job2'}],next_cursor:null});mount(f);
 await screen.findByTestId('job-open-job');fireEvent.press(screen.getByText('Xem thêm'));
 await screen.findByTestId('job-open-job2');expect(f.jobs.list).toHaveBeenLastCalledWith(expect.any(String),undefined,'next');
 fireEvent.press(screen.getByTestId('jobs-partner-partner'));await enabled('jobs-reload');expect(f.jobs.list).toHaveBeenLastCalledWith(expect.any(String),'partner',undefined);
 f.jobs.list.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('jobs-reload'));await screen.findByRole('alert');fireEvent.press(screen.getByTestId('work-retry'));await screen.findByTestId('job-open-job');
 fireEvent.press(screen.getByTestId('job-open-job'));await enabled('job-reload');fireEvent.press(screen.getByTestId('job-chat'));fireEvent.press(await screen.findByTestId('conversation-open-room'));await screen.findByTestId('message-msg1');
});
test.each(['accept','decline','withdraw','reschedule','stop','assignments'] as const)('validates and submits %s with current version',async action=>{
 const f=workFixture();mount(f,'JobDetail');await enabled('job-reload');fireEvent.press(screen.getByTestId('job-action-'+action));
 if(action==='accept')fireEvent.changeText(screen.getByTestId('job-eta'),'0');
 fireEvent.press(screen.getByTestId('job-action-confirm'));expect(f.jobs.change).not.toHaveBeenCalled();await screen.findByRole('alert');
 if(action==='accept')fireEvent.changeText(screen.getByTestId('job-eta'),'25');
 if(['decline','withdraw','reschedule','stop'].includes(action))fireEvent.changeText(screen.getByTestId('job-reason'),'DEMO reason');
 if(action==='reschedule'){fireEvent.changeText(screen.getByTestId('job-date'),'2099-12-10');fireEvent.changeText(screen.getByTestId('job-time'),'10:30');}
 if(action==='stop')fireEvent(screen.getByTestId('job-charges'),'valueChange',true);
 if(action==='assignments')fireEvent.press(screen.getByTestId('job-member-member'));
 fireEvent.press(screen.getByTestId('job-action-confirm'));await enabled('job-reload');
 expect(f.jobs.change).toHaveBeenCalledWith(expect.any(String),'job',action,expect.objectContaining({expected_version:1}),expect.any(String));
 const input=f.jobs.change.mock.calls[0][3];if(action==='accept')expect(Date.parse(input.eta!)).toBeGreaterThan(Date.now());if(action==='stop')expect(input.has_agreed_charges).toBe(true);if(action==='assignments')expect(input.membership_id).toBe('member');
});
test('conflict preserves reason, reloads version, and uncertain retry retains its mutation key',async()=>{
 const f=workFixture();f.jobs.change.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));mount(f,'JobDetail');await enabled('job-reload');fireEvent.press(screen.getByTestId('job-action-withdraw'));fireEvent.changeText(screen.getByTestId('job-reason'),'keep me');fireEvent.press(screen.getByTestId('job-action-confirm'));
 await screen.findByText('Bấm tải lại để lấy trạng thái mới nhất. Bản nhập của bạn vẫn được giữ.');
 f.jobs.get.mockResolvedValue({...job,version:2});fireEvent.press(screen.getByTestId('job-reload'));await enabled('job-reload');expect(screen.getByTestId('job-reason').props.value).toBe('keep me');
 f.jobs.change.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('job-action-confirm'));fireEvent.press(await screen.findByTestId('work-retry'));await enabled('job-reload');
 expect(f.jobs.change.mock.calls[1][3].expected_version).toBe(2);expect(f.jobs.change.mock.calls[2].slice(2)).toEqual(f.jobs.change.mock.calls[1].slice(2));
});
test.each(['at_customer','at_shop','custom'] as const)('create %s validates draft and sends selected skill/address/schedule',async mode=>{
 const f=workFixture();mount(f,'JobCreate');await screen.findByTestId('job-submit');fireEvent.press(screen.getByTestId('job-submit'));expect(f.jobs.create).not.toHaveBeenCalled();
 fireEvent.press(screen.getByTestId('job-skill-skill'));fireEvent.changeText(screen.getByLabelText('Count'),'2');fireEvent.changeText(screen.getByLabelText('Details'),'DEMO detail');fireEvent.changeText(screen.getByLabelText('Needed'),'true');
 fireEvent.press(screen.getByTestId('job-mode-'+mode));fireEvent.press(screen.getByTestId(mode==='at_shop'?'job-location-shop':'test-place'));
 fireEvent.press(screen.getByTestId('job-time-scheduled'));fireEvent.changeText(screen.getByTestId('job-date'),'2000-01-01');fireEvent.changeText(screen.getByTestId('job-time'),'10:30');fireEvent.press(screen.getByTestId('job-submit'));expect(f.jobs.create).not.toHaveBeenCalled();
 fireEvent.changeText(screen.getByTestId('job-date'),'2099-12-10');fireEvent.changeText(screen.getByTestId('job-note'),'DEMO note');
 f.jobs.create.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('job-submit'));fireEvent.press(await screen.findByTestId('work-retry'));await screen.findByTestId('job-state');
 expect(f.jobs.create.mock.calls[1]).toEqual(f.jobs.create.mock.calls[0]);expect(f.jobs.create.mock.calls[0][1]).toMatchObject({service_mode:mode,time_mode:'scheduled',note:'DEMO note',skills:[{skill_id:'skill',answers:{count:2,details:'DEMO detail',needed:true}}]});
});
test('profile load retry and revoked job permission hide inaccessible data',async()=>{
 const f=workFixture();f.partners.profile.mockRejectedValueOnce(new ApiError('NETWORK'));const view=mount(f,'JobCreate');fireEvent.press(await screen.findByTestId('work-retry'));await screen.findByTestId('job-submit');view.unmount();
 const g=workFixture();mount(g,'JobDetail');await enabled('job-reload');g.jobs.get.mockRejectedValueOnce(new ApiError('FORBIDDEN'));fireEvent.press(screen.getByTestId('job-reload'));await screen.findByRole('alert');expect(screen.queryByTestId('job-state')).toBeNull();
});
test('room list filters job links across pages and reloads errors',async()=>{
 const f=workFixture();f.chat.list.mockResolvedValueOnce({items:[{...room,id:'other',job_ids:['other']}],next_cursor:'next'});mount(f,'Conversations');await screen.findByText('Chưa có cuộc trò chuyện trong trang này.');expect(screen.queryByTestId('conversation-open-other')).toBeNull();fireEvent.press(screen.getByText('Xem thêm'));await screen.findByTestId('conversation-open-room');
 f.chat.list.mockRejectedValueOnce(new ApiError('NETWORK'));pull();await screen.findByRole('alert');expect(screen.getByTestId('conversation-open-room')).toBeTruthy();fireEvent.press(screen.getByTestId('refresh-retry'));await refreshDone();
});
test('chat merges pages, reads watermark, retries exactly one send and clears data on revoked access',async()=>{
 const f=workFixture();f.chat.messages.mockResolvedValueOnce({items:[message],next_cursor:'next'}).mockResolvedValueOnce({items:[message,{...message,id:'system',sequence:2,sender_id:null,body:'DEMO system'}],next_cursor:null});
 mount(f,'Conversation');await refreshDone();expect(screen.getAllByTestId('message-msg1')).toHaveLength(1);expect(f.chat.read).toHaveBeenCalledWith(expect.any(String),'room',2,expect.any(String));
 fireEvent.changeText(screen.getByTestId('chat-body'),'DEMO sent');f.chat.send.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('chat-send'));await screen.findByTestId('work-retry');expect(screen.getByTestId('chat-send')).toBeDisabled();fireEvent.press(screen.getByTestId('work-retry'));await screen.findByTestId('message-sent');await refreshDone();expect(f.chat.send.mock.calls[1]).toEqual(f.chat.send.mock.calls[0]);expect(screen.getByTestId('chat-body').props.value).toBe('');
 f.chat.messages.mockRejectedValueOnce(new ApiError('FORBIDDEN'));pull();await screen.findByRole('alert');expect(screen.queryByTestId('message-msg1')).toBeNull();expect(screen.getByTestId('chat-send')).toBeDisabled();
});
test('foreground refresh waits for account verification and fetches after the read watermark',async()=>{
 const original = AppState.addEventListener;
 const implementation = jest.isMockFunction(original) ? original.getMockImplementation() : undefined;
 const listeners: ((state:AppStateStatus)=>void)[]=[];const spy=jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{listeners.push(callback);return {remove:jest.fn()};});
 try {const f=workFixture();mount(f,'Conversation');await refreshDone();await act(async()=>{listeners.forEach(fn=>fn('active'));});await refreshDone();expect(f.chat.messages).toHaveBeenLastCalledWith(expect.any(String),'room',1,undefined);}finally{spy.mockRestore();if(implementation && jest.isMockFunction(original)) original.mockImplementation(implementation);}
});

test('calendar loads all authorized pages, preserves selected day on refresh and hides data after access loss',async()=>{
 const f=workFixture();mount(f);await enabled('jobs-view-calendar');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const scheduled={...job,scheduled_at:day+'T10:00:00+07:00'};
 f.jobs.list.mockResolvedValueOnce({items:[scheduled],next_cursor:'second'}).mockResolvedValueOnce({items:[{...scheduled,id:'second'}],next_cursor:null});
 fireEvent.press(screen.getByTestId('jobs-view-calendar'));await screen.findByTestId('calendar-job-second');
 expect(screen.getByTestId('calendar-job-job')).toBeTruthy();expect(f.jobs.list).toHaveBeenLastCalledWith(expect.any(String),undefined,'second');
 fireEvent.press(screen.getByTestId('calendar-next'));const selected=screen.getByTestId('calendar-selected').props.children;
 let release: (page: {items: typeof scheduled[]; next_cursor: null}) => void = () => {};
 f.jobs.list.mockResolvedValue({items:[scheduled],next_cursor:null}).mockReturnValueOnce(new Promise(resolve => {release=resolve;}));
 fireEvent.press(screen.getByTestId('jobs-reload'));await waitFor(()=>expect(screen.getByTestId('jobs-reload')).toBeDisabled());
 expect(screen.getByTestId('jobs-calendar')).toBeTruthy();
 await act(async()=>{release({items:[scheduled],next_cursor:null});});await enabled('jobs-reload');
 expect(screen.getByTestId('calendar-selected').props.children).toBe(selected);
 fireEvent.press(screen.getByTestId('calendar-today'));await screen.findByTestId('calendar-job-job');
 f.jobs.list.mockRejectedValueOnce(new ApiError('FORBIDDEN'));fireEvent.press(screen.getByTestId('jobs-reload'));await screen.findByRole('alert');expect(screen.queryByTestId('jobs-calendar')).toBeNull();
 fireEvent.press(screen.getByTestId('work-retry'));await screen.findByTestId('calendar-job-job');
 fireEvent.press(screen.getByTestId('jobs-partner-partner'));await screen.findByTestId('jobs-calendar');expect(f.jobs.list).toHaveBeenLastCalledWith(expect.any(String),'partner',undefined);
 fireEvent.press(screen.getByTestId('job-open-job'));await screen.findByTestId('job-state');
});

test('pull refresh retains chat list and draft, stops on network error and recovers without permanent reload buttons',async()=>{
 const f=workFixture();const view=mount(f,'Conversations');await screen.findByTestId('conversation-open-room');await refreshDone();
 expect(screen.queryByTestId('chat-list-reload')).toBeNull();
 let reject!: (e:ApiError)=>void;f.chat.list.mockReturnValueOnce(new Promise((_resolve,no)=>{reject=no;}));
 pull();await waitFor(()=>expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(true));
 expect(screen.getByTestId('conversation-open-room')).toBeTruthy();
 await act(async()=>reject(new ApiError('TIMEOUT')));await refreshDone();
 expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);expect(screen.getByTestId('conversation-open-room')).toBeTruthy();
 fireEvent.press(screen.getByTestId('refresh-retry'));await refreshDone();expect(screen.queryByRole('alert')).toBeNull();view.unmount();
 const g=workFixture();mount(g,'Conversation');await refreshDone();expect(screen.queryByTestId('chat-reload')).toBeNull();
 fireEvent.changeText(screen.getByTestId('chat-body'),'DEMO draft');g.chat.messages.mockRejectedValueOnce(new ApiError('NETWORK'));pull();await screen.findByTestId('refresh-retry');await refreshDone();
 expect(screen.getByTestId('message-msg1')).toBeTruthy();expect(screen.getByTestId('chat-body').props.value).toBe('DEMO draft');
 expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);fireEvent.press(screen.getByTestId('refresh-retry'));await refreshDone();expect(screen.queryByRole('alert')).toBeNull();
});

test('profile retries transient account contention before showing a load error',async()=>{
 const f=workFixture();const read=jest.spyOn(f.manager,'partnerProfile').mockRejectedValueOnce(new ApiError('BUSY'));mount(f,'PartnerProfile');
 await screen.findByTestId('profile-hire');await enabled('profile-hire');expect(read).toHaveBeenCalledTimes(2);
});
test('chat draft remains editable while the read watermark holds the account lock',async()=>{
 const f=workFixture();let finish!:(value:{id:string;state:'read'})=>void;
 f.chat.read.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));mount(f,'Conversation');await screen.findByTestId('message-msg1');
 await waitFor(()=>expect(f.chat.read).toHaveBeenCalled());expect(f.manager.getSnapshot().busy).toBe(true);
 expect(screen.getByTestId('chat-body').props.editable).toBe(true);fireEvent.changeText(screen.getByTestId('chat-body'),'DEMO draft during background read');expect(screen.getByTestId('chat-send')).not.toBeDisabled();
 fireEvent.press(screen.getByTestId('chat-send'));expect(f.chat.send).not.toHaveBeenCalled();expect(screen.getByTestId('chat-send')).toBeDisabled();
 await act(async()=>finish({id:'room',state:'read'}));await screen.findByTestId('message-sent');expect(f.chat.send).toHaveBeenCalledTimes(1);expect(f.chat.send.mock.calls[0][2].body).toBe('DEMO draft during background read');expect(screen.getByTestId('chat-body').props.value).toBe('');
});

test('job action draft stays editable during a background snapshot while confirmation waits',async()=>{
 const f=workFixture();mount(f,'JobDetail');await enabled('job-reload');
 let finish!:(value:typeof job)=>void;f.jobs.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 fireEvent.press(screen.getByTestId('job-reload'));await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(true));
 // A background refresh must not insert a row above the action buttons:
 // it moves the touch target between pointer down and pointer up.
 expect(screen.queryByText('Đang tải…')).toBeNull();
 expect(screen.getByTestId('job-action-reschedule')).not.toBeDisabled();fireEvent.press(screen.getByTestId('job-action-reschedule'));
 expect(screen.getByTestId('job-date').props.editable).toBe(true);fireEvent.changeText(screen.getByTestId('job-date'),'2099-12-11');
 expect(screen.getByTestId('job-action-confirm')).toBeDisabled();expect(f.jobs.change).not.toHaveBeenCalled();
 await act(async()=>finish(job));await enabled('job-action-confirm');expect(screen.getByTestId('job-date').props.value).toBe('2099-12-11');
});

test('fallback polling defers while drafting instead of announcing an unobserved job conflict',async()=>{
 jest.useFakeTimers();
 try {
  const f=workFixture();const view=mount(f,'JobDetail',true);await enabled('job-reload');
  fireEvent.press(screen.getByTestId('job-action-accept'));
  fireEvent.changeText(screen.getByTestId('job-eta'),'45');
  await act(async()=>jest.advanceTimersByTime(16000));
  expect(screen.queryByText('Dữ liệu hoặc điều kiện đã đổi. Tải lại và kiểm tra trước khi thao tác tiếp.')).toBeNull();
  expect(screen.getByTestId('job-eta').props.value).toBe('45');
  fireEvent.press(screen.getByTestId('job-action-confirm'));await enabled('job-reload');
  expect(f.jobs.change).toHaveBeenCalledWith(expect.any(String),'job','accept',expect.objectContaining({expected_version:1}),expect.any(String));
  view.unmount();
 } finally {jest.useRealTimers();}
});
