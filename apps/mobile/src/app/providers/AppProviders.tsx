import { createPartnersApi, type PartnersApi } from '../../features/partners/api/partners-api';
import { createContext, useContext, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { CatalogApi } from '../../features/catalog/models/catalog.types';
import { LocaleProvider } from './LocaleProvider';
import type { LocaleState } from '../../lib/i18n/locale-state';
const defaultPartners = createPartnersApi(process.env.EXPO_PUBLIC_API_URL);
const PartnersContext = createContext<PartnersApi>(defaultPartners);
export const usePartnersApi = () => useContext(PartnersContext);
const ApiContext = createContext<CatalogApi | null>(null);
export function AppProviders({ api, localeManager, partners, children }: PropsWithChildren<{ api: CatalogApi; localeManager?: LocaleState; partners?: PartnersApi }>) {
  return <SafeAreaProvider><LocaleProvider manager={localeManager}><ApiContext.Provider value={api}>
    <PartnersContext.Provider value={partners ?? defaultPartners}><StatusBar style="dark" />{children}</PartnersContext.Provider>
  </ApiContext.Provider></LocaleProvider></SafeAreaProvider>;
}
export function useCatalogApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('Catalog screens require AppProviders');
  return api;
}
