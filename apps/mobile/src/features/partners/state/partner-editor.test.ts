import { PartnerEditor } from './partner-editor';
import { ApiError } from '../../../lib/http/api-error';
import type { AuthSession } from '../../auth/state/auth-session';
const profile = { id: 'partner', version: 1, name: 'First' };
function fixture() {
  const auth = {
    createPartner: jest.fn(),
    loadPartner: jest.fn(),
    editPartner: jest.fn()
  };
  return {
    auth,
    editor: new PartnerEditor(
      auth as unknown as AuthSession,
      'owner',
      'partner'
    )
  };
}
test('lost save response retries exact key/input and locks out competing saves', async () => {
  const { auth, editor } = fixture();
  auth.loadPartner.mockResolvedValue(profile);
  await editor.load();
  auth.editPartner
    .mockRejectedValueOnce(new ApiError('NETWORK'))
    .mockResolvedValueOnce({ ...profile, version: 2 });
  await editor.edit({ action: 'profile', expected_version: 1, name: 'New' });
  expect(editor.getSnapshot().pending).toBe(true);
  await editor.load();
  expect(auth.loadPartner).toHaveBeenCalledTimes(1);
  await editor.retry();
  expect(auth.editPartner.mock.calls[0]).toEqual(
    auth.editPartner.mock.calls[1]
  );
  expect(editor.getSnapshot()).toMatchObject({
    pending: false,
    saved: true,
    value: { version: 2 }
  });
});
test('conflict stops retries, preserves saved snapshot until explicit reload and uses a new key after reload', async () => {
  const { auth, editor } = fixture();
  auth.loadPartner.mockResolvedValue(profile);
  await editor.load();
  auth.editPartner.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));
  await editor.edit({ action: 'profile', expected_version: 1, name: 'Draft' });
  await editor.retry();
  expect(auth.editPartner).toHaveBeenCalledTimes(1);
  expect(editor.getSnapshot()).toMatchObject({
    pending: false,
    error: 'VERSION_CONFLICT',
    value: profile
  });
  auth.loadPartner.mockResolvedValue({ ...profile, version: 3 });
  await editor.load();
  auth.editPartner.mockResolvedValue({ ...profile, version: 4 });
  await editor.edit({ action: 'profile', expected_version: 3, name: 'Draft' });
  expect(auth.editPartner.mock.calls[0][3]).not.toBe(
    auth.editPartner.mock.calls[1][3]
  );
});
test('retry create does not create twice; revoked authorization is terminal', async () => {
  const { auth, editor } = fixture();
  auth.createPartner
    .mockRejectedValueOnce(new ApiError('TIMEOUT'))
    .mockResolvedValueOnce(profile);
  await editor.create({ kind: 'solo', name: 'First' });
  await editor.retry();
  expect(auth.createPartner.mock.calls[0]).toEqual(
    auth.createPartner.mock.calls[1]
  );
  auth.editPartner.mockRejectedValue(new ApiError('UNAUTHENTICATED'));
  await editor.edit({
    action: 'availability',
    expected_version: 1,
    accepting_jobs: true
  });
  await editor.retry();
  expect(auth.editPartner).toHaveBeenCalledTimes(1);
  expect(editor.getSnapshot().pending).toBe(false);
});
