import * as Picker from 'expo-image-picker';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AuthSession} from '../../auth/state/auth-session';
import {workFixture} from '../../../../test/helpers/work';
import {session} from '../../../../test/helpers/auth';
import type {RootStackParamList} from '../../../app/navigation/routes';
import type {SupportApi} from '../api/support-api';
import type {Report} from '../models';
import {ApiError} from '../../../lib/http/api-error';
import {SupportScreen} from './SupportScreen';
jest.mock('expo-image-picker',()=>({launchImageLibraryAsync:jest.fn()}));
const report:Report={id:'r',state:'open',version:1,kind:'account',subject:'DEMO subject',body:'DEMO concern',job_id:null,invoice_id:null,evidence_ids:[],updates:[]};
const Stack=createNativeStackNavigator<RootStackParamList>();
function fixture(){const f=workFixture();let items:Report[]=[];
 const support:jest.Mocked<SupportApi>={asset:jest.fn(),upload:jest.fn(),list:jest.fn().mockImplementation(async()=>({items,next_cursor:null})),get:jest.fn().mockImplementation(async()=>items[0]),create:jest.fn().mockImplementation(async(_t,b)=>{const r={...report,...b,job_id:b.job_id??null};items=[r];return r;}),reply:jest.fn().mockImplementation(async(_t,_id,body,evidence_ids)=>{const r={...items[0],version:2,updates:[{actor_id:session.user.id,body,evidence_ids,visibility:'participants' as const,created_at:'2026-10-16T00:00:00Z'}]};items=[r];return r;})};
 return {...f,support,setItems:(v:Report[])=>{items=v;},manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,undefined,undefined,undefined,undefined,support)};
}
function mount(f:ReturnType<typeof fixture>,context?:{kind:'service';job_id:string}){return render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="Support" component={SupportScreen} initialParams={{context}}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);}
async function ready(f:ReturnType<typeof fixture>){await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(false));}
test('support submits job context with title, preserves lost-response retry, and lists and filters saved reports',async()=>{
 const f=fixture();f.support.create.mockRejectedValueOnce(new ApiError('NETWORK'));mount(f,{kind:'service',job_id:'job'});await screen.findByTestId('support-subject');await ready(f);
 fireEvent.changeText(screen.getByTestId('support-subject'),'DEMO title');fireEvent.changeText(screen.getByTestId('support-body'),'DEMO body');fireEvent.press(screen.getByTestId('support-send'));
 await screen.findByTestId('work-retry');fireEvent.press(screen.getByTestId('work-retry'));await screen.findByText('DEMO title');await ready(f);
 expect(f.support.create.mock.calls[0]).toEqual(f.support.create.mock.calls[1]);expect(f.support.create.mock.calls[1][1]).toEqual({kind:'service',job_id:'job',subject:'DEMO title',body:'DEMO body',evidence_ids:[]});
 await screen.findByTestId('support-state');fireEvent.press(screen.getByTestId('support-list'));await screen.findByTestId('support-open-r');fireEvent.press(screen.getByTestId('support-filter-closed'));expect(screen.queryByTestId('support-open-r')).toBeNull();
 fireEvent.press(screen.getByTestId('support-filter-all'));fireEvent.press(screen.getByTestId('support-open-r'));await screen.findByTestId('support-state');
});
test('support uploads and removes draft photos, then attaches evidence to the correct update',async()=>{
 const f=fixture();f.setItems([report]);const asset={id:'photo',status:'ready' as const,download_url:'http://photo',expires_at:'2099-01-01T00:00:00Z'};
 f.support.upload.mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue(asset);f.support.asset.mockResolvedValue(asset);
 const blob=new Blob(['DEMO'],{type:'image/png'});jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({canceled:false,assets:[{uri:'blob:demo',width:1,height:1,file:blob as File}]});
 mount(f);await screen.findByTestId('support-open-r');fireEvent.press(screen.getByTestId('support-open-r'));await screen.findByTestId('support-body');await ready(f);
 fireEvent.press(screen.getByTestId('evidence-pick'));await screen.findByTestId('work-retry');fireEvent.press(screen.getByTestId('work-retry'));await screen.findByTestId('evidence-remove-photo');await ready(f);expect(f.support.upload.mock.calls[0]).toEqual(f.support.upload.mock.calls[1]);
 fireEvent.press(screen.getByTestId('evidence-remove-photo'));expect(screen.queryByTestId('evidence-remove-photo')).toBeNull();
 fireEvent.press(screen.getByTestId('evidence-pick'));await screen.findByTestId('evidence-remove-photo');await ready(f);
 fireEvent.changeText(screen.getByTestId('support-body'),'DEMO added');fireEvent.press(screen.getByTestId('support-send'));await screen.findByText('DEMO added');expect(f.support.reply.mock.calls[0].slice(1,4)).toEqual(['r','DEMO added',['photo']]);
});
test('support handles closed cases, pagination and private draft revocation',async()=>{
 const f=fixture();f.setItems([report]);f.support.list.mockResolvedValueOnce({items:[report],next_cursor:'next'}).mockResolvedValueOnce({items:[{...report,id:'closed',state:'closed'}],next_cursor:null});mount(f);
 await screen.findByTestId('support-open-closed');expect(f.support.list.mock.calls[1][1]).toBe('next');f.support.get.mockResolvedValueOnce({...report,id:'closed',state:'closed'});fireEvent.press(screen.getByTestId('support-open-closed'));await screen.findByText('Yêu cầu đã đóng. Bạn vẫn xem được lịch sử và có thể tạo yêu cầu mới.');expect(screen.queryByTestId('support-send')).toBeNull();await ready(f);
 fireEvent.press(screen.getByTestId('support-list'));await screen.findByTestId('support-open-r');fireEvent.press(screen.getByTestId('support-open-r'));await screen.findByTestId('support-body');await ready(f);
 fireEvent.changeText(screen.getByTestId('support-body'),'Private draft');await waitFor(()=>expect(screen.getByTestId('support-send')).not.toBeDisabled());f.support.reply.mockRejectedValue(new ApiError('FORBIDDEN'));await act(async()=>{fireEvent.press(screen.getByTestId('support-send'));});expect(f.support.reply).toHaveBeenCalled();await waitFor(()=>expect(screen.queryByDisplayValue('Private draft')).toBeNull());
});
