import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture, session } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';

async function mount() {
  const f = authFixture('saved');
  render(<AppProviders api={{ categories: async () => [], skills: async () => [] }}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(screen.getByRole('button', { name: 'Tài khoản' }));
  const open = await screen.findByTestId('profile-open');
  await waitFor(() => expect(open).not.toBeDisabled()); fireEvent.press(open);
  await screen.findByTestId('profile-name'); return f;
}
test('edit through navigation, keep draft across VI/EN/JA, retry lost response and update account', async () => {
  const f = await mount();
  fireEvent.changeText(screen.getByTestId('profile-name'), 'New name');
  fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await waitFor(() => expect(screen.getByTestId('locale-ja')).not.toBeDisabled());
  expect(screen.getByTestId('profile-name').props.value).toBe('New name');
  fireEvent.press(screen.getByRole('button', { name: '日本語' }));
  await waitFor(() => expect(screen.getByTestId('locale-vi')).not.toBeDisabled());
  expect(screen.getByTestId('profile-name').props.value).toBe('New name');
  fireEvent.press(screen.getByRole('button', { name: 'Tiếng Việt' }));
  await waitFor(() => expect(screen.getByTestId('locale-en')).not.toBeDisabled());
  f.accounts.edit.mockClear();
  f.accounts.edit.mockRejectedValueOnce(new ApiError('NETWORK'));
  fireEvent.press(screen.getByTestId('profile-save')); await screen.findByRole('alert');
  expect(screen.getByTestId('profile-name').props.editable).toBe(false);
  fireEvent.press(screen.getByTestId('profile-save')); await screen.findByText('Đã lưu tên hiển thị.');
  expect(f.accounts.edit.mock.calls[0]).toEqual(f.accounts.edit.mock.calls[1]);
  f.api.me.mockResolvedValue({ ...session.user, display_name: 'New name', version: 2 });
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(await screen.findByText('New name')).toBeVisible();
});
test('conflict keeps draft and shows current name after explicit reload; revoked account hides form', async () => {
  const f = await mount(); fireEvent.changeText(screen.getByTestId('profile-name'), 'My draft');
  f.accounts.edit.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));
  fireEvent.press(screen.getByTestId('profile-save')); await screen.findByRole('alert');
  expect(screen.queryByTestId('profile-save')).toBeNull();
  f.api.me.mockResolvedValue({ ...session.user, display_name: 'Other device', version: 3 });
  fireEvent.press(screen.getByTestId('profile-reload')); await screen.findByText('Tên đang lưu: Other device');
  expect(screen.getByTestId('profile-name').props.value).toBe('My draft');
  f.accounts.edit.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')); f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  fireEvent.press(screen.getByTestId('profile-save'));
  expect(await screen.findByText('Phiên đã kết thúc. Hãy đăng nhập lại để sửa hồ sơ.')).toBeVisible();
  expect(screen.queryByTestId('profile-name')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' })); });
  expect(await screen.findByTestId('auth-email')).toBeVisible();
});
