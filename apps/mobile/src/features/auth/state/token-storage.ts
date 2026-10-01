import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenStorage } from '../models/auth.types';
const key = process.env.EXPO_PUBLIC_AUTH_STORAGE_NAMESPACE === 'native-test' ? 'dvqb.auth.refresh.test.v1' : 'dvqb.auth.refresh.v1';
// Web preview is memory-only. Never persist auth tokens in localStorage.
let webToken: string | null = null;
export const tokenStorage: TokenStorage = {
  read: () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(key),
  write: async token => {
    if (Platform.OS === 'web') webToken = token;
    else await SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  clear: async () => {
    if (Platform.OS === 'web') webToken = null;
    else await SecureStore.deleteItemAsync(key);
  },
};
