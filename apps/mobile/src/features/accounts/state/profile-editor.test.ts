import { authFixture, credentials, session } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';
import { ProfileEditor } from './profile-editor';
async function setup() {
  const f = authFixture(); await f.manager.login(credentials);
  const editor = new ProfileEditor(f.manager, session.user.id); await editor.load();
  return { ...f, editor };
}
test('lost response retains exact payload/key and does not claim success or allow changing pending input', async () => {
  const f = await setup(); f.editor.setName('  New Name  ');
  f.accounts.edit.mockRejectedValueOnce(new ApiError('TIMEOUT'));
  await f.editor.save(); expect(f.editor.getSnapshot()).toMatchObject({ saved: false, pending: true, error: 'TIMEOUT' });
  f.editor.setName('Different'); expect(f.editor.getSnapshot().name).toBe('  New Name  ');
  await f.editor.load(); expect(f.api.me).toHaveBeenCalledTimes(1);
  await f.editor.save(); expect(f.accounts.edit.mock.calls[0]).toEqual(f.accounts.edit.mock.calls[1]);
  expect(f.manager.getSnapshot().user).toMatchObject({ display_name: 'New Name', version: 2 });
  expect(f.editor.getSnapshot()).toMatchObject({ saved: true, pending: false, name: 'New Name' });
});
test('version conflict preserves draft, requires explicit reload and a new key before resaving', async () => {
  const f = await setup(); f.editor.setName('My draft');
  f.accounts.edit.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));
  await f.editor.save(); await f.editor.save(); expect(f.accounts.edit).toHaveBeenCalledTimes(1);
  f.api.me.mockResolvedValueOnce({ ...session.user, display_name: 'Other device', version: 7 });
  await f.editor.load(); expect(f.editor.getSnapshot()).toMatchObject({ name: 'My draft', currentName: 'Other device', version: 7, conflict: false });
  await f.editor.save(); expect(f.accounts.edit.mock.calls[1][1]).toEqual({ expected_version: 7, display_name: 'My draft' });
  expect(f.accounts.edit.mock.calls[1][2]).not.toBe(f.accounts.edit.mock.calls[0][2]);
});
test('validation, load retry, double submit and unknown failure are safe', async () => {
  const f = await setup(); f.editor.setName(' '); await f.editor.save(); expect(f.accounts.edit).not.toHaveBeenCalled();
  f.editor.setName('x'.repeat(101)); await f.editor.save(); expect(f.editor.getSnapshot().error).toBe('VALIDATION');
  f.editor.setName('Name'); f.accounts.edit.mockRejectedValueOnce(new Error('PRIVATE'));
  await f.editor.save(); expect(f.editor.getSnapshot().error).toBe('NETWORK');
  let done!: (value: typeof session.user) => void;
  f.accounts.edit.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
  const pending = f.editor.save(); await f.editor.save(); f.editor.setName('ignored');
  done({ ...session.user, display_name: 'Name', version: 2 }); await pending;
  f.api.me.mockRejectedValueOnce(new ApiError('NETWORK')); await f.editor.load();
  expect(f.editor.getSnapshot().name).toBe('Name'); await f.editor.load();
});
test('profile refresh is serialized, reuses mutation key on 401 and cannot update a different account', async () => {
  const f = await setup(); f.editor.setName('Changed');
  f.accounts.edit.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await f.editor.save(); expect(f.api.refresh).toHaveBeenCalledTimes(1);
  expect(f.accounts.edit.mock.calls[0].slice(1)).toEqual(f.accounts.edit.mock.calls[1].slice(1));
  await f.manager.logout();
  await expect(f.manager.editProfile(session.user.id, { display_name: 'Late', expected_version: 2 }, 'key')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(f.manager.getSnapshot().user).toBeNull();
});
test('expired access rotates, revoked refresh clears session, replay never regresses snapshot', async () => {
  const f = authFixture(); f.api.login.mockResolvedValueOnce({ ...session, expires_at: '2000-01-01T00:00:00Z' });
  await f.manager.login(credentials); await f.manager.loadProfile(session.user.id); expect(f.api.refresh).toHaveBeenCalledTimes(1);
  f.api.me.mockResolvedValueOnce({ ...session.user, version: 9, display_name: 'Latest' }); await f.manager.verify();
  await f.manager.editProfile(session.user.id, { expected_version: 1, display_name: 'Old replay' }, 'key');
  expect(f.manager.getSnapshot().user?.display_name).toBe('Latest');
  f.accounts.edit.mockRejectedValue(new ApiError('UNAUTHENTICATED')); f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await expect(f.manager.editProfile(session.user.id, { expected_version: 9, display_name: 'New' }, 'key2')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(f.manager.getSnapshot().phase).toBe('anonymous');
});
test('profile lock rejects overlapping operations and logout waits for a later explicit tap', async () => {
  const f = await setup(); let done!: (value: typeof session.user) => void;
  f.accounts.edit.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
  const save = f.manager.editProfile(session.user.id, { expected_version: 1, display_name: 'New' }, 'key');
  await expect(f.manager.loadProfile(session.user.id)).rejects.toMatchObject({ code: 'BUSY' });
  await f.manager.logout(); expect(f.api.logout).not.toHaveBeenCalled();
  done({ ...session.user, version: 2 }); await save;
  await f.manager.logout(); expect(f.manager.getSnapshot().user).toBeNull();
});

test('locale-only account updates advance the profile version without losing the name draft', async () => {
  const f = await setup(); f.editor.setName('My draft');
  await f.manager.editProfile(session.user.id, {expected_version: 1, locale: 'en'}, 'locale-key');
  f.accounts.edit.mockImplementationOnce(async (_token, input) => {
    if (input.expected_version !== 2) throw new ApiError('VERSION_CONFLICT');
    return {...session.user, locale: 'en', display_name: input.display_name!, version: 3};
  });
  await f.editor.save();
  expect(f.editor.getSnapshot()).toMatchObject({saved: true, name: 'My draft', version: 3, conflict: false});
  expect(f.accounts.edit.mock.calls[1][1]).toEqual({expected_version: 2, display_name: 'My draft'});
});

test('a newer account snapshot with another name does not silently overwrite that name', async () => {
  const f = await setup(); f.editor.setName('My draft');
  f.api.me.mockResolvedValueOnce({...session.user, display_name: 'Other device', version: 2});
  await f.manager.verify();
  f.accounts.edit.mockImplementationOnce(async (_token, input) => {
    if (input.expected_version !== 2) throw new ApiError('VERSION_CONFLICT');
    return {...session.user, display_name: input.display_name!, version: 3};
  });
  await f.editor.save();
  expect(f.editor.getSnapshot()).toMatchObject({saved: false, name: 'My draft', conflict: true});
  expect(f.accounts.edit.mock.calls[0][1].expected_version).toBe(1);
});
