import {act,fireEvent,render,screen} from '@testing-library/react-native';
import {Pressable,Text,View} from 'react-native';
import {NotificationsProvider,useNotifications} from './NotificationsProvider';
import {ApiError} from '../../lib/http/api-error';
let mockOwner:string|undefined='a',mockBusy=false;
const mockList=jest.fn(),mockRead=jest.fn(),mockListen=jest.fn();
const mockManager={listNotifications:mockList,readNotification:mockRead,getSnapshot:()=>({busy:mockBusy})};
const mockClient={connected:true,listen:mockListen};
jest.mock('../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:mockManager,state:{phase:mockOwner?'authenticated':'anonymous',user:mockOwner?{id:mockOwner,status:'active'}:null}})}));
jest.mock('../../app/providers/RealtimeProvider',()=>({useRealtime:()=>mockClient}));
const notice={id:'one',kind:'job.accepted.v1',resource_ref:{job_id:'job'},read_at:null,created_at:'2026-10-21T00:00:00Z'};
function Inbox(){const {items,refresh,markRead}=useNotifications();return <View><Text testID="count">{items.filter(n=>!n.read_at).length}</Text><Text testID="read">{items[0]?.read_at??'unread'}</Text><Pressable testID="refresh" onPress={()=>void refresh()}/><Pressable testID="mark-read" onPress={()=>void markRead(['one'])}/></View>;}
const tree=()=> <NotificationsProvider><Inbox/></NotificationsProvider>;
const tick=async(ms=250)=>{await act(async()=>{jest.advanceTimersByTime(ms);});};
const signal=(source='sync')=>mockListen.mock.calls.at(-1)![0](source==='sync'?{kind:'sync'}:{kind:'event',event:{type:'notification.created.v1'}});
beforeEach(()=>{jest.useFakeTimers();mockOwner='a';mockBusy=false;mockClient.connected=true;mockList.mockReset();mockRead.mockReset().mockResolvedValue({state:'read'});mockListen.mockReset().mockReturnValue(jest.fn());});
afterEach(()=>jest.useRealTimers());
test.each(['sync','notification'])('fresh %s invalidation reconciles notifications after a failed poll without waiting for cooldown',async(source)=>{
 mockList.mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({items:[notice],next_cursor:null});render(tree());await tick();await tick(1000);expect(mockList).toHaveBeenCalledTimes(1);
 act(()=>signal(source));await tick();expect(mockList).toHaveBeenCalledTimes(2);expect(screen.getByTestId('count')).toHaveTextContent('1');
});
test('notification invalidation during a failing poll remains eligible for the next tick',async()=>{
 let reject!:(error:unknown)=>void;mockList.mockImplementationOnce(()=>new Promise((_resolve,fail)=>{reject=fail;})).mockResolvedValue({items:[notice],next_cursor:null});render(tree());await tick();act(()=>signal());await act(async()=>reject(new ApiError('NETWORK')));
 await tick();expect(mockList).toHaveBeenCalledTimes(2);expect(screen.getByTestId('count')).toHaveTextContent('1');
});
test('notification failure retains cooldown without a fresh signal and explicit refresh still reconciles',async()=>{
 mockList.mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({items:[notice],next_cursor:null});render(tree());await tick();await tick(29000);expect(mockList).toHaveBeenCalledTimes(1);
 await act(async()=>{fireEvent.press(screen.getByTestId('refresh'));});expect(mockList).toHaveBeenCalledTimes(2);expect(screen.getByTestId('count')).toHaveTextContent('1');
});
test('notification reconciliation preserves a local read mark and discards the previous account snapshot',async()=>{
 mockList.mockResolvedValueOnce({items:[notice],next_cursor:null});const view=render(tree());await tick();let resolve!:(value:unknown)=>void;mockList.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
 act(()=>signal());await tick();await act(async()=>{fireEvent.press(screen.getByTestId('mark-read'));});expect(screen.getByTestId('count')).toHaveTextContent('0');
 await act(async()=>resolve({items:[notice],next_cursor:null}));expect(screen.getByTestId('count')).toHaveTextContent('0');expect(screen.getByTestId('read')).not.toHaveTextContent('unread');
 mockList.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));act(()=>signal());await tick();mockOwner='b';view.rerender(tree());expect(screen.getByTestId('count')).toHaveTextContent('0');
 await act(async()=>resolve({items:[{...notice,id:'private-old'}],next_cursor:null}));expect(screen.getByTestId('count')).toHaveTextContent('0');mockList.mockResolvedValue({items:[],next_cursor:null});await tick();expect(mockList).toHaveBeenLastCalledWith('b',undefined);
});
