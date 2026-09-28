import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createCatalogApi } from '../features/catalog/api/catalog-api';
import { CatalogScreen } from '../features/catalog/screens/CatalogScreen';
const api = createCatalogApi(process.env.EXPO_PUBLIC_API_URL);
export default function App() {
  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7FC' }}><StatusBar style="dark" /><CatalogScreen api={api} /></SafeAreaView></SafeAreaProvider>;
}
