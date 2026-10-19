import * as Picker from 'expo-image-picker';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AuthSession} from '../../auth/state/auth-session';
import {workFixture} from '../../../../test/helpers/work';
import type {RootStackParamList} from '../../../app/navigation/routes';
import type {VerificationApi,Verification} from '../api/verification-api';
import {ApiError} from '../../../lib/http/api-error';
import {VerificationScreen} from './VerificationScreen';
jest.mock('expo-image-picker',()=>({launchImageLibraryAsync:jest.fn()}));
const row:Verification={id:'r',partner_id:'p',kind:'identity',state:'awaiting_evidence',version:2,reason:'DEMO clearer evidence',details:{kind:'identity',statement:'Old DEMO'},document_asset_ids:[],created_at:'2026-10-19T00:00:00Z',history:[]};
const Stack=createNativeStackNavigator<RootStackParamList>();
function fixture(){const f=workFixture();f.partners.management.mockResolvedValue({id:'p',kind:'solo'} as never);let items:Verification[]=[row];const api:jest.Mocked<VerificationApi>={asset:jest.fn(),upload:jest.fn(),list:jest.fn().mockImplementation(async()=>({items,next_cursor:null})),submit:jest.fn().mockImplementation(async(_t,_p,input)=>{const r={...row,...input,id:'new',state:'pending',version:1};items=[r,...items];return r;})};return {...f,verification:api,manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,undefined,undefined,undefined,undefined,undefined,api)};}
function mount(f:ReturnType<typeof fixture>){render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator><Stack.Screen name="Verification" component={VerificationScreen} initialParams={{id:'p'}}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);}
const ready=async(f:ReturnType<typeof fixture>)=>waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(false));
test('verification screen submits additional private evidence with exact prior version and retries without changing payload',async()=>{
 const f=fixture();const asset={id:'photo',status:'ready' as const,download_url:'http://photo',expires_at:'2099-01-01T00:00:00Z'};f.verification.upload.mockResolvedValue(asset);f.verification.asset.mockResolvedValue(asset);f.verification.submit.mockRejectedValueOnce(new ApiError('NETWORK'));
 jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({canceled:false,assets:[{uri:'blob:demo',width:1,height:1,file:new Blob(['DEMO'],{type:'image/png'}) as File}]});mount(f);await screen.findByText(row.reason!);await ready(f);
 fireEvent.changeText(screen.getByTestId('verification-statement'),'New DEMO');fireEvent.press(screen.getByTestId('verification-pick'));await screen.findByTestId('evidence-photo');await ready(f);fireEvent.press(screen.getByTestId('verification-submit'));await screen.findByTestId('work-retry');fireEvent.press(screen.getByTestId('work-retry'));await waitFor(()=>expect(f.verification.submit).toHaveBeenCalledTimes(2));expect(f.verification.submit.mock.calls[0]).toEqual(f.verification.submit.mock.calls[1]);expect(f.verification.submit.mock.calls[0][2]).toEqual({document_asset_ids:['photo'],details:{kind:'identity',statement:'New DEMO'},previous_request_id:'r',expected_version:2});await waitFor(()=>expect(screen.queryByTestId('verification-submit')).toBeNull());
});
test('verification screen keeps pending records read-only and clears private data when access is revoked',async()=>{const f=fixture();f.verification.list.mockResolvedValue({items:[{...row,state:'pending'}],next_cursor:null});mount(f);await screen.findByText('Old DEMO');expect(screen.queryByTestId('verification-submit')).toBeNull();await ready(f);f.verification.list.mockRejectedValue(new ApiError('FORBIDDEN'));await act(async()=>{fireEvent.press(screen.getByTestId('verification-refresh'));});await waitFor(()=>expect(screen.queryByText('Old DEMO')).toBeNull());});
