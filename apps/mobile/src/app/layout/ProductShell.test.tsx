import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppNavigator } from '../navigation/AppNavigator';
import { AppProviders } from '../providers/AppProviders';
import { AuthProvider } from '../providers/AuthProvider';
import { authFixture, credentials } from '../../../test/helpers/auth';
const category = { id: 'industry', code: 'home_utilities', name_vi: 'Điện nước', active: true, parent_id: null };
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
  expect(screen.getAllByRole('tab')).toHaveLength(1);
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
test('opening account from a category preserves its route, and catalog destination returns to root', async () => {
  mount();
  fireEvent.press(await screen.findByRole('button', { name: 'Điện nước' }));
  await screen.findByText('Chưa có dịch vụ đang hoạt động.');
  fireEvent.press(screen.getByTestId('nav-account'));
  await screen.findByTestId('auth-email');
  fireEvent.press(screen.getByTestId('nav-back'));
  expect(await screen.findByRole('header', { name: 'Điện nước' })).toBeVisible();
  fireEvent.press(screen.getByTestId('nav-catalog'));
  expect(await screen.findByRole('header', { name: 'Bạn cần dịch vụ gì?' })).toBeVisible();
  await screen.findByRole('button', { name: 'Điện nước' });
  expect(screen.queryByTestId('nav-back')).toBeNull();
  fireEvent.press(screen.getByTestId('nav-catalog'));
  expect(screen.queryByTestId('nav-back')).toBeNull();
});
