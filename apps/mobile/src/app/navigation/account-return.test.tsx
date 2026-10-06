import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';
import { AppProviders } from '../providers/AppProviders';
import { AuthProvider } from '../providers/AuthProvider';
import { authFixture, credentials, session } from '../../../test/helpers/auth';
import { ApiError } from '../../lib/http/api-error';
import { accountDestination } from './routes';
async function expiredScreen(route: 'profile'|'sessions'|'addresses') {
  const f=authFixture('stored');
  render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(screen.getByRole('button',{name:'Tài khoản'}));const button=await screen.findByTestId(route+'-open');await waitFor(()=>expect(button).not.toBeDisabled());fireEvent.press(button);
  await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(false));
  f.api.me.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await act(()=>f.manager.verify());
  fireEvent.press(await screen.findByRole('button',{name:'Đăng nhập'}));await screen.findByTestId('auth-submit');return f;
}
test.each(['profile','sessions','addresses'] as const)('login returns to %s with fresh data and no automatic mutation',async route=>{
  const f=await expiredScreen(route);
  f.api.login.mockResolvedValue({...session,user:{...session.user,id:'00000000-0000-4000-8000-000000000002',display_name:'New owner'}});
  f.api.me.mockResolvedValue({...session.user,id:'00000000-0000-4000-8000-000000000002',display_name:'New owner'});
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByTestId(route==='profile'?'profile-name':route==='addresses'?'addresses-empty':'sessions-revoke-others');
  expect(screen.queryByTestId('auth-submit')).toBeNull();expect(f.accounts.edit).not.toHaveBeenCalled();expect(f.accounts.saveAddress).not.toHaveBeenCalled();expect(f.accounts.revokeSession).not.toHaveBeenCalled();
  expect(f.manager.getSnapshot().user?.display_name).toBe('New owner');
});
test('failed login stays in form; back abandons the destination',async()=>{
  const f=await expiredScreen('addresses');f.api.login.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByRole('alert');expect(screen.queryByTestId('addresses-empty')).toBeNull();
  fireEvent.press(screen.getByRole('button',{name:'Quay lại'}));await screen.findByTestId('auth-submit');
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByTestId('addresses-open');expect(screen.queryByTestId('addresses-empty')).toBeNull();
});
test('destination whitelist rejects URLs, mutations and unknown screens',()=>{
  for(const value of [undefined,null,'https://example.test','revokeSession','Admin',{},'CatalogHome'])expect(accountDestination(value)).toBeNull();
  expect(accountDestination('Profile')).toBe('Profile');expect(accountDestination('Sessions')).toBe('Sessions');expect(accountDestination('Addresses')).toBe('Addresses');
});
