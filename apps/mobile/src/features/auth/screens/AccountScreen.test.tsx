import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture, credentials, session } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';
async function mount(f = authFixture()) {
  render(<AppProviders api={{ categories: async () => [], skills: async () => [] }}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(await screen.findByRole('button', { name: 'Tài khoản' }));
  return f;
}
test('register through real navigation, show unverified account and logout', async () => {
  const f = await mount();
  fireEvent.press(await screen.findByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
  fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Người thử');
  fireEvent.changeText(screen.getByLabelText('Email'), credentials.email);
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), credentials.password);
  fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  expect(await screen.findByText('Email chưa xác minh')).toBeVisible();
  expect(f.api.register).toHaveBeenCalledWith({ ...credentials, display_name: 'Người thử' });
  fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  expect(await screen.findByRole('button', { name: 'Đăng ký' })).toBeVisible();
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(await screen.findByRole('header', { name: 'Tìm người phù hợp.' })).toBeVisible();
});
test('failed login retains email, clears password and lets user retry', async () => {
  const f = authFixture(); f.api.login.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')); await mount(f);
  await screen.findByRole('button', { name: 'Đăng nhập' });
  fireEvent.changeText(screen.getByLabelText('Email'), credentials.email);
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), credentials.password);
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(screen.getByDisplayValue(credentials.email)).toBeVisible(); expect(screen.getByLabelText('Mật khẩu').props.value).toBe('');
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), credentials.password);
  fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText(session.user.display_name)).toBeVisible();
});
test('offline restore offers retry and does not falsely show login success', async () => {
  const f = authFixture('stored'); f.api.refresh.mockRejectedValueOnce(new ApiError('NETWORK')); await mount(f);
  fireEvent.press(await screen.findByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Email chưa xác minh')).toBeVisible();
});
test('keyboard submit ignores incomplete input and submits completed registration', async () => {
  const f = await mount();
  fireEvent.press(await screen.findByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }));
  fireEvent(screen.getByLabelText('Mật khẩu'), 'submitEditing');
  expect(f.api.register).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Người thử');
  fireEvent.changeText(screen.getByLabelText('Email'), credentials.email);
  fireEvent.changeText(screen.getByLabelText('Mật khẩu'), credentials.password);
  fireEvent(screen.getByLabelText('Mật khẩu'), 'submitEditing');
  expect(await screen.findByText('Email chưa xác minh')).toBeVisible();
  expect(f.api.register).toHaveBeenCalledTimes(1);
});

test('account Point shows available API balance, retries read failure and clears on logout',async()=>{
 const f=authFixture('saved');const points=jest.spyOn(f.manager,'getPoints').mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({balance:'12000',held:'2000',available:'10000'});
 await mount(f);
 fireEvent.press(await screen.findByRole('button',{name:'Thử lại'}));
 expect(await screen.findByTestId('account-points')).toHaveTextContent('10.000 Point');expect(points).toHaveBeenCalledTimes(2);
 fireEvent.press(screen.getByTestId('auth-logout'));await screen.findByTestId('auth-email');expect(screen.queryByTestId('account-points')).toBeNull();
});

test('account groups preserve personal, work, membership selection and support destinations',async()=>{
 await mount(authFixture('saved'));
 const personal=await screen.findByTestId('account-personal'),work=screen.getByTestId('account-work'),security=screen.getByTestId('account-security');
 for(const id of ['profile-open','addresses-open','notification-settings-open'])expect(within(personal).getByTestId(id)).toBeVisible();
 for(const id of ['role-customer','role-profiles','jobs-open','conversations-open','partners-open','team-open'])expect(within(work).getByTestId(id)).toBeVisible();
 for(const id of ['security-open','verify-open','sessions-open','support-open'])expect(within(security).getByTestId(id)).toBeVisible();
 expect(within(security).queryByTestId('auth-logout')).toBeNull();expect(screen.getByTestId('auth-logout')).toBeVisible();
 fireEvent.press(screen.getByTestId('team-open'));expect(await screen.findByTestId('memberships-reload')).toBeVisible();
});
