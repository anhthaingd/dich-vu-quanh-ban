import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenStorage } from '../models/auth.types';
const key = process.env.EXPO_PUBLIC_AUTH_STORAGE_NAMESPACE === 'native-test' ? 'dvqb.auth.refresh.test.v1' : 'dvqb.auth.refresh.v1';
// B00-33 (owner decision 12/11/2026): the web app keeps the sign-in across reloads and tabs in localStorage.
// Readable by any script on this origin, so logout and a revoked session always clear it. If the browser blocks
// storage (private mode, policy), the token stays in memory only and sign-in still works for this tab.
let webToken: string | null = null;
function local(): Storage | null { try { return globalThis.localStorage ?? null; } catch { return null; } }
type Locks = { request<T>(name: string, work: () => Promise<T>): Promise<T> };
export const tokenStorage: TokenStorage = {
  get shared() { return Platform.OS === 'web'; },
  read: async () => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
    // The stored value is the newest across tabs; memory covers a browser that refused to store it.
    try { return local()?.getItem(key) ?? webToken; } catch { return webToken; }
  },
  write: async token => {
    if (Platform.OS !== 'web') { await SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); return; }
    webToken = token;
    try { local()?.setItem(key, token); } catch { /* memory fallback */ }
  },
  clear: async () => {
    if (Platform.OS !== 'web') { await SecureStore.deleteItemAsync(key); return; }
    webToken = null;
    try { local()?.removeItem(key); } catch { /* nothing stored */ }
  },
  exclusive: <T>(work: () => Promise<T>) => {
    const locks = Platform.OS === 'web' ? (globalThis.navigator as { locks?: Locks } | undefined)?.locks : undefined;
    return locks ? locks.request('dvqb.auth.refresh', work) : work();
  },
};
