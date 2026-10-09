/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static local asset references. */
import { useFonts } from 'expo-font';
import {createInvoicesApi} from '../features/invoices/api/invoices-api';
import {createJobsApi} from '../features/jobs/api/jobs-api';
import {createChatApi} from '../features/chat/api/chat-api';
import { createPartnersApi } from '../features/partners/api/partners-api';
import { createAccountsApi } from '../features/accounts/api/accounts-api';
import { createCatalogApi } from '../features/catalog/api/catalog-api';
import { AppNavigator } from './navigation/AppNavigator';
import { AppProviders } from './providers/AppProviders';
import { AuthProvider } from './providers/AuthProvider';
import { createAuthApi } from '../features/auth/api/auth-api';
import { AuthSession } from '../features/auth/state/auth-session';
import { tokenStorage } from '../features/auth/state/token-storage';
const api = createCatalogApi(process.env.EXPO_PUBLIC_API_URL);
const partners = createPartnersApi(process.env.EXPO_PUBLIC_API_URL);
const auth = new AuthSession(createAuthApi(process.env.EXPO_PUBLIC_API_URL), tokenStorage, createAccountsApi(process.env.EXPO_PUBLIC_API_URL), partners, createJobsApi(process.env.EXPO_PUBLIC_API_URL), createChatApi(process.env.EXPO_PUBLIC_API_URL), createInvoicesApi(process.env.EXPO_PUBLIC_API_URL));
export default function App() {
  const [loaded, error] = useFonts({
    BeVietnam: require('../../assets/fonts/BeVietnamPro-Regular.ttf'),
    BeVietnamSemiBold: require('../../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    BeVietnamBold: require('../../assets/fonts/BeVietnamPro-Bold.ttf'),
  });
  if (!loaded && !error) return null;
  return <AppProviders api={api} partners={partners}><AuthProvider manager={auth}><AppNavigator /></AuthProvider></AppProviders>;
}
