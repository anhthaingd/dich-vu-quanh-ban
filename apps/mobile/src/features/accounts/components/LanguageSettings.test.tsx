import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { LocaleState } from '../../../lib/i18n/locale-state';
import { ApiError } from '../../../lib/http/api-error';
import { authFixture, credentials, session } from '../../../../test/helpers/auth';
const industry = { id: 'industry', code: 'home', name_vi: 'Điện nước', name: 'Điện nước', name_locale: 'vi' as const, active: true, parent_id: null };
function mount(f = authFixture(), store = { read: jest.fn().mockResolvedValue(null), write: jest.fn().mockResolvedValue(undefined) }) {
  const locale = new LocaleState(store);
  const api = { categories: jest.fn(async (id?: string) => id ? [] : [industry]), skills: jest.fn(async () => []) };
  render(<AppProviders api={api} localeManager={locale}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  return { f, locale, store, api };
}
test('VI → JA → EN retains form, translates a visible error without another request, and retains session', async () => {
  const { f } = mount();
  fireEvent.press(screen.getByTestId('nav-account'));
  await screen.findByTestId('auth-email');
  fireEvent.press(screen.getByTestId('auth-toggle'));
  fireEvent.changeText(screen.getByTestId('auth-name'), 'Tên người dùng');
  fireEvent.changeText(screen.getByTestId('auth-email'), credentials.email);
  fireEvent.changeText(screen.getByTestId('auth-password'), credentials.password);
  fireEvent.press(screen.getByTestId('locale-ja'));
  await screen.findByText('アカウントを作成');
  expect(screen.getByTestId('auth-password').props.value).toBe(credentials.password);
  expect(screen.getByTestId('auth-name').props.value).toBe('Tên người dùng');
  f.api.register.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  fireEvent.press(screen.getByTestId('auth-submit')); await screen.findByRole('alert');
  expect(screen.getByRole('alert')).toHaveTextContent(/認証できません/);
  fireEvent.press(screen.getByTestId('locale-en'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Unable to authenticate/));
  expect(f.api.register).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('auth-email').props.value).toBe(credentials.email);
  fireEvent.changeText(screen.getByTestId('auth-password'), credentials.password);
  fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByText('Email chưa xác minh'); // Account locale wins over the guest English preference.
  expect(f.accounts.edit).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('locale-en'));
  await screen.findByText('Email not verified');
  fireEvent.press(screen.getByTestId('locale-vi'));
  await screen.findByText('Email chưa xác minh');
  expect(f.manager.getSnapshot().user).toMatchObject({...session.user,version:3});
  expect(f.api.logout).not.toHaveBeenCalled();
});
test('locale changes preserve the selected category and translate a catalog failure', async () => {
  const { locale, api } = mount();
  fireEvent.press(await screen.findByRole('button', { name: 'Điện nước' }));
  await act(async () => locale.select('en'));
  expect(screen.getByTestId('search-service-selected')).toHaveTextContent('Điện nước');
  expect(api.categories).toHaveBeenCalledWith(undefined, expect.anything(), 'en');
  api.categories.mockRejectedValueOnce(new Error('network'));
  await act(async () => locale.select('ja'));
  expect(await screen.findByRole('alert')).toHaveTextContent(/サービスを読み込めません/);
  fireEvent.press(screen.getByRole('button', { name: '再試行' }));
  expect(await screen.findByTestId('home-category-industry')).toBeVisible();
  expect(screen.getByTestId('search-service-selected')).toHaveTextContent('Điện nước');
});
test('language write failure is visible, preserves selection and can be retried', async () => {
  const { store } = mount();
  fireEvent.press(screen.getByTestId('nav-account'));
  await waitFor(() => expect(screen.getByTestId('locale-en')).toBeEnabled());
  store.write.mockRejectedValueOnce(Error('private'));
  fireEvent.press(screen.getByTestId('locale-en'));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Chưa lưu được ngôn ngữ/);
  expect(screen.getByRole('button', { name: 'Tiếng Việt', selected: true })).toBeVisible();
  fireEvent.press(screen.getByTestId('locale-en'));
  await screen.findByRole('header', { name: 'Account' });
  expect(screen.queryByRole('alert')).toBeNull();
});
