import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppNavigator } from '../navigation/AppNavigator';
import { AppProviders } from '../providers/AppProviders';
import { AuthProvider } from '../providers/AuthProvider';
import { authFixture, credentials } from '../../../test/helpers/auth';
const category = { id: 'industry', code: 'home_utilities', name_vi: 'Điện nước', name: 'Điện nước', name_locale: 'vi' as const, active: true, parent_id: null };
function mount() {
  const auth = authFixture();
  const api = { categories: jest.fn(async (id?: string) => id ? [] : [category]), skills: jest.fn(async () => []) };
  render(<AppProviders api={api}><AuthProvider manager={auth.manager}><AppNavigator /></AuthProvider></AppProviders>);
  return auth;
}
test('avatar follows the current session and resets after logout without adding an account tab', async () => {
  const auth = mount();
  await screen.findByRole('button', { name: 'Điện nước' });
  expect(screen.getByTestId('account-initial')).toHaveTextContent('?');
  expect(screen.getAllByRole('tab')).toHaveLength(4);
  expect(screen.getByRole('tab', { name: 'Tìm dịch vụ', selected: true })).toBeVisible();
  await act(async () => auth.manager.login(credentials));
  expect(screen.getByTestId('account-initial')).toHaveTextContent('N');
  fireEvent.press(screen.getByTestId('nav-account'));
  await screen.findByText('Email chưa xác minh');
  fireEvent.press(screen.getByTestId('auth-logout'));
  await screen.findByTestId('auth-email');
  fireEvent.press(screen.getByTestId('nav-back'));
  await screen.findByRole('button', { name: 'Điện nước' });
  expect(screen.getByTestId('account-initial')).toHaveTextContent('?');
});
test('home keeps service selection after account, and protected tabs have real destinations', async () => {
  mount();
  fireEvent.press(await screen.findByRole('button', { name: 'Điện nước' }));
  fireEvent.press(screen.getByTestId('nav-account'));
  await screen.findByTestId('auth-email');
  fireEvent.press(screen.getByTestId('nav-back'));
  expect(await screen.findByTestId('search-service-selected')).toHaveTextContent('Điện nước');
  expect(screen.getByTestId('nav-notifications')).toBeDisabled();
  fireEvent.press(screen.getByTestId('nav-jobs'));
  expect(await screen.findByTestId('account-continue-login')).toBeVisible();
  expect(screen.getByRole('tab', {name:'Công việc',selected:true})).toBeVisible();
  fireEvent.press(screen.getByTestId('nav-messages'));
  expect(await screen.findByRole('tab', {name:'Tin nhắn',selected:true})).toBeVisible();
  fireEvent.press(screen.getByTestId('nav-catalog'));
  expect(await screen.findByRole('header', {name:/Việc nhà có người lo/})).toBeVisible();
  expect(screen.queryByTestId('nav-back')).toBeNull();
});
