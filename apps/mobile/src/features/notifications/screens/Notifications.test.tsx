import {ScrollView} from 'react-native';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AuthSession} from '../../auth/state/auth-session';
import {workFixture} from '../../../../test/helpers/work';
import type {RootStackParamList} from '../../../app/navigation/routes';
import type {NotificationsApi} from '../api/notifications-api';
import {NotificationsProvider} from '../NotificationsProvider';
import {NotificationsScreen,NotificationSettingsScreen} from './NotificationsScreen';
import {ApiError} from '../../../lib/http/api-error';
const Stack=createNativeStackNavigator<RootStackParamList>();
const settings={message_push:true,call_push:true,service_push:true,reminder_push:true};
const notice={id:'notice',kind:'job.accepted.v1',resource_ref:{job_id:'job'},read_at:null,created_at:'2026-10-14T00:00:00Z'};
function fixture(){const f=workFixture();const api:jest.Mocked<NotificationsApi>={list:jest.fn().mockResolvedValue({items:[notice],next_cursor:null}),read:jest.fn().mockResolvedValue({id:'notice',state:'read'}),settings:jest.fn().mockResolvedValue(settings),save:jest.fn().mockImplementation(async(_,b)=>b)};
 return {...f,notices:api,manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,undefined,undefined,api)};}
function mount(f:ReturnType<typeof fixture>,initial:'Notifications'|'NotificationSettings'='Notifications'){
 return render(<AppProviders api={{categories:jest.fn().mockResolvedValue([]),skills:jest.fn().mockResolvedValue([])}}><AuthProvider manager={f.manager}><NotificationsProvider><NavigationContainer><Stack.Navigator initialRouteName={initial} screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="Notifications" component={NotificationsScreen}/><Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen}/></Stack.Navigator></NavigationContainer></NotificationsProvider></AuthProvider></AppProviders>);
}
test('inbox reads all pages, deduplicates IDs, marks across pages and clears private data on logout',async()=>{
 const f=fixture();f.notices.list.mockImplementation(async(_,cursor)=>cursor?{items:[notice,{...notice,id:'second'}],next_cursor:null}:{items:[notice],next_cursor:'page2'});mount(f);
 await screen.findByTestId('notice-second');expect(screen.getAllByTestId('notice-notice')).toHaveLength(1);
 fireEvent.press(screen.getByTestId('notices-read-all'));await waitFor(()=>expect(f.notices.read).toHaveBeenCalledTimes(2));
 fireEvent.press(screen.getByTestId('notices-unread'));await screen.findByText('Bạn đã đọc hết thông báo.');
 await act(async()=>f.manager.logout());expect(screen.queryByTestId('notice-second')).toBeNull();expect(screen.getByTestId('account-continue-login')).toBeVisible();
});
test('notification retry retains read key and denied target never navigates using stale permissions',async()=>{
 const f=fixture();f.notices.read.mockRejectedValueOnce(new ApiError('NETWORK'));f.jobs.get.mockRejectedValue(new ApiError('NOT_FOUND'));mount(f);
 fireEvent.press(await screen.findByTestId('notice-notice'));await screen.findByTestId('work-retry');fireEvent.press(screen.getByTestId('work-retry'));
 await waitFor(()=>expect(f.notices.read).toHaveBeenCalledTimes(2));expect(f.notices.read.mock.calls[0]).toEqual(f.notices.read.mock.calls[1]);
 await waitFor(()=>expect(f.jobs.get).toHaveBeenCalled());expect(screen.getByTestId('notices-all')).toBeVisible();await screen.findByRole('alert');
});
test('reminder settings retain form across locale changes and retry the same immutable payload',async()=>{
 const f=fixture();mount(f,'NotificationSettings');const toggle=await screen.findByTestId('setting-reminder_push');fireEvent(toggle,'valueChange',false);
 fireEvent.press(screen.getByRole('button',{name:'English'}));expect(screen.getByTestId('setting-reminder_push').props.value).toBe(false);
 f.notices.save.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('notices-save'));await screen.findByTestId('work-retry');expect(screen.getByTestId('setting-reminder_push')).toBeDisabled();
 fireEvent.press(screen.getByTestId('work-retry'));await screen.findByTestId('notices-saved');expect(f.notices.save.mock.calls[0]).toEqual(f.notices.save.mock.calls[1]);expect(f.notices.save.mock.calls[1][1]).toEqual({...settings,reminder_push:false});
});

test('pull refresh keeps notices visible, stops after failure, retries and clears denied data',async()=>{
 const f=fixture();mount(f);await screen.findByTestId('notice-notice');
 await waitFor(()=>expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.accessibilityState.busy).toBe(false));expect(screen.queryByTestId('notices-reload')).toBeNull();
 let reject!: (e:ApiError)=>void;f.notices.list.mockReturnValueOnce(new Promise((_resolve,no)=>{reject=no;}));
 act(()=>screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh());await waitFor(()=>expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(true));expect(screen.getByTestId('notice-notice')).toBeTruthy();
 await act(async()=>reject(new ApiError('NETWORK')));await screen.findByTestId('refresh-retry');
 await waitFor(()=>expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false));expect(screen.getByTestId('notice-notice')).toBeTruthy();
 await waitFor(()=>expect(screen.getByTestId('refresh-retry')).not.toBeDisabled());await act(async()=>{fireEvent.press(screen.getByTestId('refresh-retry'));});await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
 f.notices.list.mockRejectedValueOnce(new ApiError('FORBIDDEN'));act(()=>screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh());await screen.findByRole('alert');expect(screen.queryByTestId('notice-notice')).toBeNull();
});
