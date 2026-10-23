import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AuthSession} from '../../auth/state/auth-session';
import {workFixture} from '../../../../test/helpers/work';
import type {RootStackParamList} from '../../../app/navigation/routes';
import type {OrganizationsApi} from '../api/organizations-api';
import {OrganizationsScreen} from './OrganizationsScreen';
import {VerifyContactScreen} from './VerifyContactScreen';
import {TeamScreen} from './TeamScreen';
import {ApiError} from '../../../lib/http/api-error';
const mine={id:'self',partner_id:'partner',partner_name:'DEMO team',partner_kind:'company' as const,is_owner:true,active:true,permissions:[],version:1,left_at:null};
const worker={id:'worker',user_id:'worker',display_name:'DEMO worker',is_owner:false,active:true,permissions:[],version:1};
const Stack=createNativeStackNavigator<RootStackParamList>();
function fixture(){const f=workFixture();const team:jest.Mocked<OrganizationsApi>={memberships:jest.fn().mockResolvedValue({items:[mine],next_cursor:null}),invitations:jest.fn().mockResolvedValue({items:[],next_cursor:null}),invite:jest.fn().mockResolvedValue({id:'invite',version:1,state:'pending'}),accept:jest.fn().mockResolvedValue(worker),invitationChange:jest.fn().mockResolvedValue({id:'invite',version:2}),preview:jest.fn().mockResolvedValue({membership_version:1,total:2,items:[],next_cursor:null}),leave:jest.fn().mockResolvedValue({id:'self',version:2,state:'left'}),remove:jest.fn().mockResolvedValue({...worker,active:false}),reauth:jest.fn().mockResolvedValue({grant:'a'.repeat(64),expires_at:'2099-01-01T00:00:00Z'}),grants:jest.fn().mockResolvedValue(worker),contact:jest.fn().mockResolvedValue({partner_id:'partner',membership_id:null,version:1}),setContact:jest.fn().mockResolvedValue({id:'partner',version:2,state:'updated'}),challenge:jest.fn().mockResolvedValue({id:'challenge',expires_at:'2099-01-01T00:00:00Z',resend_after_seconds:60}),verify:jest.fn().mockResolvedValue({id:'challenge',version:1,state:'verified'})};f.jobs.members.mockResolvedValue({items:[worker],next_cursor:null});return {...f,team,manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,undefined,team)};}
function mount(f:ReturnType<typeof fixture>,initial:'Organizations'|'Team'|'VerifyContact'){
 return render(<AppProviders api={{categories:jest.fn().mockResolvedValue([]),skills:jest.fn().mockResolvedValue([])}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator initialRouteName={initial} screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="Organizations" component={OrganizationsScreen}/><Stack.Screen name="Team" component={TeamScreen} initialParams={{id:'partner'}}/><Stack.Screen name="VerifyContact" component={VerifyContactScreen}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);
}
test('local verification masks the code, enforces resend delay, clears secrets and refreshes account flags',async()=>{
 const f=fixture();mount(f,'VerifyContact');await screen.findByTestId('verify-contact');fireEvent.changeText(screen.getByTestId('verify-contact'),'owner@example.test');fireEvent.press(screen.getByTestId('verify-send'));await screen.findByTestId('verify-code');expect(screen.getByTestId('verify-send')).toBeDisabled();expect(screen.getByTestId('verify-code').props.secureTextEntry).toBe(true);
 fireEvent.changeText(screen.getByTestId('verify-code'),'123987');f.team.verify.mockRejectedValueOnce(new ApiError('CHALLENGE_INVALID'));fireEvent.press(screen.getByTestId('verify-confirm'));await screen.findByRole('alert');expect(screen.getByTestId('verify-code').props.value).toBe('');fireEvent.changeText(screen.getByTestId('verify-code'),'987123');fireEvent.press(screen.getByTestId('verify-confirm'));await screen.findByTestId('verify-done');expect(f.api.me).toHaveBeenCalled();
});
test('invitation acceptance retains mutation key on network failure and membership departure needs confirmation',async()=>{
 const f=fixture();f.team.memberships.mockResolvedValue({items:[{...mine,is_owner:false}],next_cursor:null});mount(f,'Organizations');await screen.findByTestId('team-leave-self');fireEvent.changeText(screen.getByTestId('team-token'),'b'.repeat(64));f.team.accept.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('team-accept'));await screen.findByRole('alert');fireEvent.press(screen.getByText('Thử lại'));await waitFor(()=>expect(f.team.accept).toHaveBeenCalledTimes(2));expect(f.team.accept.mock.calls[0]).toEqual(f.team.accept.mock.calls[1]);await waitFor(()=>expect(screen.getByTestId('team-token').props.value).toBe(''));
 fireEvent.press(screen.getByTestId('team-leave-self'));await screen.findByTestId('team-leave-confirm');expect(f.team.leave).not.toHaveBeenCalled();fireEvent.changeText(screen.getByTestId('team-leave-reason'),'DEMO leave');fireEvent.press(screen.getByTestId('team-leave-confirm'));await waitFor(()=>expect(f.team.leave).toHaveBeenCalledWith(expect.any(String),'self',1,'DEMO leave',expect.any(String)));
});
test('team follows member and invitation tabs, reauthenticates before grants and previews removal',async()=>{
 const f=fixture();mount(f,'Team');await screen.findByTestId('team-invite-open');fireEvent.press(screen.getByTestId('team-invite-open'));fireEvent.changeText(screen.getByTestId('team-invite-contact'),'worker@example.test');fireEvent.press(screen.getByTestId('team-invite-submit'));await waitFor(()=>expect(f.team.invite).toHaveBeenCalled());await waitFor(()=>expect(screen.queryByTestId('team-invite-contact')).toBeNull());
 fireEvent.press(screen.getByTestId('team-tab-permissions'));fireEvent.press(screen.getByTestId('team-grants-worker'));fireEvent(screen.getByTestId('grant-jobs.assign'),'valueChange',true);fireEvent.changeText(screen.getByTestId('team-grant-reason'),'DEMO grant');fireEvent.changeText(screen.getByTestId('team-grant-password'),'DEMO password');fireEvent.press(screen.getByTestId('team-grant-save'));await waitFor(()=>expect(f.team.grants).toHaveBeenCalledWith(expect.any(String),'worker',1,['jobs.assign'],'DEMO grant','a'.repeat(64),expect.any(String)));await waitFor(()=>expect(screen.queryByTestId('team-grant-password')).toBeNull());
 fireEvent.press(screen.getByTestId('team-tab-members'));fireEvent.press(screen.getByTestId('team-remove-worker'));await screen.findByTestId('team-remove-confirm');expect(f.team.remove).not.toHaveBeenCalled();fireEvent.changeText(screen.getByTestId('team-remove-reason'),'DEMO remove');fireEvent.press(screen.getByTestId('team-remove-confirm'));await waitFor(()=>expect(f.team.remove).toHaveBeenCalled());
});
test('team clears private lists when access is revoked on reload',async()=>{
 const f=fixture();mount(f,'Team');await screen.findByTestId('team-remove-worker');f.team.memberships.mockResolvedValue({items:[],next_cursor:null});fireEvent.press(screen.getByTestId('team-reload'));await screen.findByRole('alert');expect(screen.queryByTestId('team-remove-worker')).toBeNull();
});
test('wallet-only staff has a wallet entry without profile or membership administration',async()=>{
 const f=fixture();f.team.memberships.mockResolvedValue({items:[{...mine,is_owner:false,permissions:['wallet.read']}],next_cursor:null});mount(f,'Organizations');await screen.findByTestId('membership-wallet-partner');expect(screen.queryByTestId('team-open-partner')).toBeNull();
 await waitFor(()=>expect(screen.getByTestId('memberships-reload')).toBeEnabled());
 const reads=f.team.memberships.mock.calls.length;
 f.team.memberships.mockResolvedValue({items:[{...mine,is_owner:false,permissions:[],active:false}],next_cursor:null});fireEvent.press(screen.getByTestId('memberships-reload'));
 await waitFor(()=>expect(f.team.memberships).toHaveBeenCalledTimes(reads+1));await waitFor(()=>expect(screen.queryByTestId('membership-wallet-partner')).toBeNull());
});
test('role membership refresh does not take the form lock and rejects its late result after logout',async()=>{
 const f=fixture();await f.manager.restore();const owner=f.manager.getSnapshot().user!.id;
 let resolve!:(page:{items:typeof mine[];next_cursor:null})=>void;f.team.memberships.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const pending=f.manager.myMemberships(owner);expect(f.manager.getSnapshot().busy).toBe(false);
 const denied=expect(pending).rejects.toMatchObject({code:'UNAUTHENTICATED'});await f.manager.logout();resolve({items:[mine],next_cursor:null});await denied;expect(f.manager.getSnapshot().phase).toBe('anonymous');
});
test('membership cards contain no raw text children that crash native views',async()=>{
 const f=fixture(),view=mount(f,'Organizations');await screen.findByTestId('membership-wallet-partner');
 const invalid:string[]=[];
 const inspect=(node:unknown)=>{if(Array.isArray(node)){node.forEach(inspect);return;}if(!node||typeof node!=='object')return;const n=node as {type?:string;children?:unknown[]};if(n.type==='View')for(const child of n.children??[])if(typeof child==='string')invalid.push(child);n.children?.forEach(inspect);};
 inspect(view.toJSON());expect(invalid).toEqual([]);
});
