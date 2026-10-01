import { createCatalogApi } from '../features/catalog/api/catalog-api';
import { AppNavigator } from './navigation/AppNavigator';
import { AppProviders } from './providers/AppProviders';
import { AuthProvider } from './providers/AuthProvider';
import { createAuthApi } from '../features/auth/api/auth-api';
import { AuthSession } from '../features/auth/state/auth-session';
import { tokenStorage } from '../features/auth/state/token-storage';
const api = createCatalogApi(process.env.EXPO_PUBLIC_API_URL);
const auth = new AuthSession(createAuthApi(process.env.EXPO_PUBLIC_API_URL), tokenStorage);
export default function App() {
  return <AppProviders api={api}><AuthProvider manager={auth}><AppNavigator /></AuthProvider></AppProviders>;
}
