import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CatalogScreen } from '../../features/catalog/screens/CatalogScreen';
import { SessionsScreen } from '../../features/accounts/screens/SessionsScreen';
import { AddressesScreen } from '../../features/accounts/screens/AddressesScreen';
import { ProfileScreen } from '../../features/accounts/screens/ProfileScreen';
import { AccountScreen } from '../../features/auth/screens/AccountScreen';
import { theme } from '../../theme/tokens';
import type { RootStackParamList } from './routes';
// Routes keep identity only; names are loaded in the current locale.
const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors,
  primary: theme.colors.primary, background: theme.colors.background,
  card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border,
} };
export function AppNavigator() {
  return <NavigationContainer theme={navigationTheme}>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="CatalogHome" component={CatalogScreen} />
      <Stack.Screen name="CatalogCategory" component={CatalogScreen} getId={({ params }) => params.categoryId} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Sessions" component={SessionsScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
    </Stack.Navigator>
  </NavigationContainer>;
}
