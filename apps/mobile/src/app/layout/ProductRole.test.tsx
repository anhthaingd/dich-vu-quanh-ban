import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {ProductShell} from './ProductShell';
import {ProductRoleProvider,useProductRole} from '../providers/ProductRoleProvider';
import {AppProviders} from '../providers/AppProviders';
import {AuthProvider} from '../providers/AuthProvider';
import {Button} from '../../components/ui/Button';
import {authFixture,credentials} from '../../../test/helpers/auth';
function Probe(){const role=useProductRole();return <ProductShell onCatalog={()=>{}} onJobs={()=>{}} onMessages={()=>{}} onNotifications={()=>{}}><Button testID="choose-role" label="Choose" onPress={()=>void role.choose('partner')}/></ProductShell>;}
test('explicit owner and employee contexts change tabs and logout removes the selected partner',async()=>{
 const f=authFixture();
 const member={id:'membership',partner_id:'partner',partner_name:'DEMO shop',partner_kind:'shop' as const,is_owner:true,active:true,permissions:['wallet.read'],version:1,left_at:null};
 const memberships=jest.spyOn(f.manager,'myMemberships').mockResolvedValue({items:[member],next_cursor:null});
 render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><ProductRoleProvider><NavigationContainer><Probe/></NavigationContainer></ProductRoleProvider></AuthProvider></AppProviders>);
 await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));await act(()=>f.manager.login(credentials));expect(screen.getByTestId('nav-catalog')).toBeVisible();fireEvent.press(screen.getByTestId('choose-role'));
 await screen.findByTestId('nav-wallet');expect(screen.queryByTestId('nav-catalog')).toBeNull();
 memberships.mockResolvedValue({items:[{...member,is_owner:false}],next_cursor:null});fireEvent.press(screen.getByTestId('choose-role'));
 await waitFor(()=>expect(screen.queryByTestId('nav-wallet')).toBeNull());expect(screen.getAllByRole('tab')).toHaveLength(3);
 await act(()=>f.manager.logout());expect(screen.getByTestId('nav-catalog')).toBeVisible();expect(screen.queryByTestId('nav-wallet')).toBeNull();
});
