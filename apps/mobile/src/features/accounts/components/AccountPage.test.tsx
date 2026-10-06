import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';
import { AccountPage } from './AccountPage';
import { AppText } from '../../../components/ui/AppText';

test('an offline secure-session restore hides private content and retries instead of asking for new login', async () => {
  const f = authFixture('saved'); f.api.refresh.mockRejectedValueOnce(new ApiError('NETWORK'));
  const login = jest.fn();
  render(<AppProviders api={{ categories: async () => [], skills: async () => [] }}><AuthProvider manager={f.manager}><AccountPage title="addresses.title" back={jest.fn()} login={login}>
    {owner => <AppText>{'Private data for '+owner}</AppText>}
  </AccountPage></AuthProvider></AppProviders>);
  expect(screen.queryByText(/^Private data/)).toBeNull();
  fireEvent.press(await screen.findByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText(/^Private data/)).toBeVisible();expect(login).not.toHaveBeenCalled();
});
