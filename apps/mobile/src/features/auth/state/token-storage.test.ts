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
test('web preview keeps tokens in memory without touching native storage', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  await tokenStorage.write('memory'); expect(await tokenStorage.read()).toBe('memory');
  await tokenStorage.clear(); expect(await tokenStorage.read()).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});
