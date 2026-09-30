import { createContext, useContext, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { CatalogApi } from '../../features/catalog/models/catalog.types';
const ApiContext = createContext<CatalogApi | null>(null);
export function AppProviders({ api, children }: PropsWithChildren<{ api: CatalogApi }>) {
  return <SafeAreaProvider><ApiContext.Provider value={api}>
    <StatusBar style="dark" />{children}
  </ApiContext.Provider></SafeAreaProvider>;
}
export function useCatalogApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('Catalog screens require AppProviders');
  return api;
}
