import {fireEvent,render,screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {AuthSession} from '../../auth/state/auth-session';
import {workFixture} from '../../../../test/helpers/work';
import type {RootStackParamList} from '../../../app/navigation/routes';
import type {OrganizationsApi} from '../api/organizations-api';
import {VerifyContactScreen} from './VerifyContactScreen';
import {ApiError} from '../../../lib/http/api-error';
const Stack=createNativeStackNavigator<RootStackParamList>();
function mount(){
 const f=workFixture();
 const team={challenge:jest.fn(),verify:jest.fn()} as unknown as jest.Mocked<OrganizationsApi>;
 const manager=new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,undefined,team);
 render(<AppProviders api={{categories:jest.fn().mockResolvedValue([]),skills:jest.fn().mockResolvedValue([])}}><AuthProvider manager={manager}><NavigationContainer><Stack.Navigator initialRouteName="VerifyContact" screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="VerifyContact" component={VerifyContactScreen}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);
 return team;
}
async function send(team:jest.Mocked<OrganizationsApi>,error:ApiError){
 team.challenge.mockRejectedValueOnce(error);
 fireEvent.changeText(await screen.findByTestId('verify-contact'),'owner@example.test');
 fireEvent.press(screen.getByTestId('verify-send'));
 await screen.findByRole('alert');
}
test('a contact that local testing cannot reach says so and can be retried at once (no countdown)',async()=>{
 const team=mount();
 await send(team,new ApiError('LOCAL_CONTACT_NOT_ALLOWED',503,undefined,undefined,undefined,'LOCAL_EMAIL_NOT_ALLOWED'));
 expect(screen.getByText(/Bản thử nghiệm chưa gửi mã tới email này/)).toBeVisible();
 expect(screen.getByTestId('verify-send')).toBeEnabled();
 expect(screen.queryByText(/Gửi lại sau/)).toBeNull();
});
test('only a server rate limit starts the wait, using Retry-After',async()=>{
 const team=mount();
 await send(team,new ApiError('RATE_LIMITED',429,undefined,undefined,30,'CODE_RESEND_TOO_SOON'));
 expect(screen.getByText(/Hãy chờ khoảng 1 phút trước khi gửi lại/)).toBeVisible();
 expect(screen.getByTestId('verify-send')).toBeDisabled();
 expect(screen.getByText('Gửi lại sau 30 giây')).toBeVisible();
});
test('editing the contact clears the previous error',async()=>{
 const team=mount();
 await send(team,new ApiError('LOCAL_CONTACT_NOT_ALLOWED',503,undefined,undefined,undefined,'LOCAL_PHONE_NOT_ALLOWED'));
 expect(screen.getByRole('alert')).toBeVisible();
 fireEvent.changeText(screen.getByTestId('verify-contact'),'other@example.test');
 expect(screen.queryByRole('alert')).toBeNull();
});
