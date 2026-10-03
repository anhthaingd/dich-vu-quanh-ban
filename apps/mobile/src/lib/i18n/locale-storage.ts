import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Locale } from './index';
export interface LocaleStorage { read(): Promise<string | null>; write(locale: Locale): Promise<void> }
const key = process.env.EXPO_PUBLIC_AUTH_STORAGE_NAMESPACE === 'native-test' ? 'dvqb.locale.test.v1' : 'dvqb.locale.v1';
// This preference is not a credential. Reuse the installed native store without
// adding a native dependency; the web preview can persist it in localStorage.
export const localeStorage: LocaleStorage = {
  read: async () => Platform.OS === 'web' ? globalThis.localStorage.getItem(key) : SecureStore.getItemAsync(key),
  write: async locale => {
    if (Platform.OS === 'web') globalThis.localStorage.setItem(key, locale);
    else await SecureStore.setItemAsync(key, locale, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
};
