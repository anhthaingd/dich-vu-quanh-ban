import { createCatalogApi } from '../features/catalog/api/catalog-api';
import { AppNavigator } from './navigation/AppNavigator';
import { AppProviders } from './providers/AppProviders';
const api = createCatalogApi(process.env.EXPO_PUBLIC_API_URL);
export default function App() {
  return <AppProviders api={api}><AppNavigator /></AppProviders>;
}
