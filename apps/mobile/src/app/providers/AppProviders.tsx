import { createContext, useContext, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { CatalogApi } from '../../features/catalog/models/catalog.types';
import { LocaleProvider } from './LocaleProvider';
import type { LocaleState } from '../../lib/i18n/locale-state';
const ApiContext = createContext<CatalogApi | null>(null);
export function AppProviders({ api, localeManager, children }: PropsWithChildren<{ api: CatalogApi; localeManager?: LocaleState }>) {
  return <SafeAreaProvider><LocaleProvider manager={localeManager}><ApiContext.Provider value={api}>
    <StatusBar style="dark" />{children}
  </ApiContext.Provider></LocaleProvider></SafeAreaProvider>;
}
export function useCatalogApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('Catalog screens require AppProviders');
  return api;
}
