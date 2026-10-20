import {act,render,screen} from '@testing-library/react-native';
import {Text,Pressable} from 'react-native';
import {MessageUnreadProvider,useMessageUnread} from './MessageUnreadProvider';
import type {Signal} from '../../lib/realtime/realtime-client';
let mockOwner:string|undefined='a',mockBusy=false;
const mockList=jest.fn(),mockListen=jest.fn(),mockUnlisten=jest.fn();
const mockManager={unreadConversations:mockList,getSnapshot:()=>({busy:mockBusy})};
const mockClient={connected:true,listen:mockListen};
jest.mock('../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:mockManager,state:{phase:mockOwner?'authenticated':'anonymous',user:mockOwner?{id:mockOwner,status:'active'}:null}})}));
jest.mock('../../app/providers/RealtimeProvider',()=>({useRealtime:()=>mockClient}));
function Count(){const {unread,invalidate}=useMessageUnread();return <Pressable testID="invalidate" onPress={invalidate}><Text testID="count">{unread}</Text></Pressable>;}
const tree=()=> <MessageUnreadProvider><Count/></MessageUnreadProvider>;
const tick=async(ms=250)=>{await act(async()=>{jest.advanceTimersByTime(ms);});};
const event=()=>mockListen.mock.calls.at(-1)![0]({kind:'event',event:{type:'conversation.read.v1'}} as Signal);
beforeEach(()=>{jest.useFakeTimers();mockOwner='a';mockBusy=false;mockClient.connected=true;mockList.mockReset();mockListen.mockReset().mockReturnValue(mockUnlisten);mockUnlisten.mockClear();});
afterEach(()=>jest.useRealTimers());
test('message badge totals all pages, dedupes conversations and refreshes reads without adding events',async()=>{
 mockList.mockResolvedValueOnce({items:[{id:'one',unread:2}],next_cursor:'next'}).mockResolvedValueOnce({items:[{id:'one',unread:2},{id:'two',unread:3}],next_cursor:null});
 render(tree());await tick();expect(screen.getByTestId('count')).toHaveTextContent('5');expect(mockList).toHaveBeenLastCalledWith('a','next');
 mockList.mockResolvedValue({items:[{id:'one',unread:0},{id:'two',unread:3}],next_cursor:null});
 act(()=>{event();event();});await tick();expect(screen.getByTestId('count')).toHaveTextContent('3');expect(mockList).toHaveBeenCalledTimes(3);
});
test('message invalidation during HTTP remains dirty and account switch discards late snapshots',async()=>{
 let resolve!:(v:unknown)=>void;mockList.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const view=render(tree());await tick();act(()=>event());
 await act(async()=>resolve({items:[{id:'one',unread:1}],next_cursor:null}));
 mockList.mockResolvedValue({items:[{id:'one',unread:2}],next_cursor:null});await tick();expect(screen.getByTestId('count')).toHaveTextContent('2');
 mockList.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));act(()=>event());await tick();
 mockOwner='b';view.rerender(tree());expect(screen.getByTestId('count')).toHaveTextContent('0');
 await act(async()=>resolve({items:[{id:'one',unread:90}],next_cursor:null}));expect(screen.getByTestId('count')).toHaveTextContent('0');
 mockList.mockResolvedValue({items:[],next_cursor:null});await tick();expect(mockList).toHaveBeenLastCalledWith('b',undefined);
 mockOwner=undefined;view.rerender(tree());await tick();expect(screen.getByTestId('count')).toHaveTextContent('0');expect(mockUnlisten).toHaveBeenCalled();
});
test('message badge waits for forms and retries failed or cyclic pages without publishing partial totals',async()=>{
 mockBusy=true;mockList.mockResolvedValue({items:[{id:'one',unread:4}],next_cursor:'cycle'});render(tree());await tick();expect(mockList).not.toHaveBeenCalled();
 mockBusy=false;await tick();expect(screen.getByTestId('count')).toHaveTextContent('0');expect(mockList).toHaveBeenCalledTimes(2);
 await tick(29000);expect(mockList).toHaveBeenCalledTimes(2);
 mockList.mockResolvedValue({items:[{id:'one',unread:4}],next_cursor:null});await tick(1000);expect(screen.getByTestId('count')).toHaveTextContent('4');
});
test('message badge reconciles by HTTP while transport is disabled',async()=>{
 mockClient.connected=false;mockList.mockResolvedValue({items:[],next_cursor:null});render(tree());await tick();
 mockList.mockResolvedValue({items:[{id:'one',unread:1}],next_cursor:null});await tick(15000);expect(screen.getByTestId('count')).toHaveTextContent('1');
});
