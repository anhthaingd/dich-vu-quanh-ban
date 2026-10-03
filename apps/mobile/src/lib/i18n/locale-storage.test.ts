import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { localeStorage } from './locale-storage';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6 }));
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });
test('native preference has a separate key from credentials and supports cold start', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('ja');
  expect(await localeStorage.read()).toBe('ja'); await localeStorage.write('en');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dvqb.locale.v1', 'en', { keychainAccessible: 6 });
});
test('web preferences persist locally and propagate quota failures for safe UI recovery', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map();
  const setItem = jest.fn((k, v) => { data.set(k, v); });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem } });
  try {
    expect(await localeStorage.read()).toBeNull();
    await localeStorage.write('ja'); expect(await localeStorage.read()).toBe('ja');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    setItem.mockImplementationOnce(() => { throw Error('quota'); });
    await expect(localeStorage.write('en')).rejects.toThrow('quota');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
