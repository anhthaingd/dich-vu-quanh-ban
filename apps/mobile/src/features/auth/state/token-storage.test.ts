import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from './token-storage';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6 }));
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });
test('native refresh token uses device-bound Keychain/Keystore and surfaces storage errors', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('saved-token');
  expect(await tokenStorage.read()).toBe('saved-token');
  await tokenStorage.write('new-token');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dvqb.auth.refresh.v1', 'new-token', { keychainAccessible: 6 });
  await tokenStorage.clear(); expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('dvqb.auth.refresh.v1');
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(tokenStorage.write('token')).rejects.toThrow('storage unavailable');
});
test('web keeps the sign-in in localStorage across reloads, falls back to memory and locks rotation across tabs (B00-33)', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const data = new Map<string, string>();
  const fake = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
  try {
    expect(tokenStorage.shared).toBe(true);
    await tokenStorage.write('saved'); expect(data.get('dvqb.auth.refresh.v1')).toBe('saved');
    data.set('dvqb.auth.refresh.v1', 'rotated-by-other-tab'); expect(await tokenStorage.read()).toBe('rotated-by-other-tab');
    await tokenStorage.clear(); expect(data.size).toBe(0); expect(await tokenStorage.read()).toBeNull();
    fake.setItem = () => { throw new Error('blocked'); };
    await tokenStorage.write('memory-only'); expect(await tokenStorage.read()).toBe('memory-only');
    const request = jest.fn((_name: string, work: () => Promise<unknown>) => work());
    Object.defineProperty(globalThis.navigator, 'locks', { value: { request }, configurable: true });
    expect(await tokenStorage.exclusive!(async () => 'done')).toBe('done'); expect(request).toHaveBeenCalledWith('dvqb.auth.refresh', expect.any(Function));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis.navigator as { locks?: unknown }).locks;
  }
});
