import {AdminScreen} from '../../features/admin/screens/AdminScreen';
import {useAuth} from '../providers/AuthProvider';
import {VerificationScreen} from '../../features/verification/screens/VerificationScreen';
import {SupportScreen,RestrictedSupportScreen} from '../../features/support/screens/SupportScreen';
import {ReviewsScreen} from '../../features/reviews/screens/ReviewsScreen';
import {NotificationsScreen,NotificationSettingsScreen} from '../../features/notifications/screens/NotificationsScreen';
import {OrganizationsScreen} from '../../features/organizations/screens/OrganizationsScreen';
import {TeamScreen} from '../../features/organizations/screens/TeamScreen';
import {VerifyContactScreen} from '../../features/organizations/screens/VerifyContactScreen';
import {InvoiceScreen} from '../../features/invoices/screens/InvoiceScreen';
import {ConversationScreen} from '../../features/chat/screens/ConversationScreen';
import {ConversationsScreen} from '../../features/chat/screens/ConversationsScreen';
import {JobDetailScreen} from '../../features/jobs/screens/JobDetailScreen';
import {JobCreateScreen} from '../../features/jobs/screens/JobCreateScreen';
import {JobsScreen} from '../../features/jobs/screens/JobsScreen';
import { PartnersScreen } from '../../features/partners/screens/PartnersScreen';
import { PartnerEditorScreen } from '../../features/partners/screens/PartnerEditorScreen';
import { PartnerProfileScreen } from '../../features/partners/screens/PartnerProfileScreen';
import { SearchScreen } from '../../features/search/screens/SearchScreen';
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
  const {state} = useAuth();
  if(state.phase==='authenticated'&&state.user?.status==='suspended')return <NavigationContainer key={"support:"+state.user.id}><Stack.Navigator screenOptions={{headerShown:false}}><Stack.Screen name="Support" component={RestrictedSupportScreen}/></Stack.Navigator></NavigationContainer>;
  if (state.phase === 'authenticated' && state.user?.admin_permissions?.length) {
    return <AdminScreen key={state.user.id} />;
  }
  return <NavigationContainer key="ordinary" theme={navigationTheme}>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="CatalogHome" component={SearchScreen} />
      <Stack.Screen name="CatalogCategory" component={CatalogScreen} getId={({ params }) => params.categoryId} />
      <Stack.Screen name="Partners" component={PartnersScreen} />
      <Stack.Screen name="PartnerEditor" component={PartnerEditorScreen} />
      <Stack.Screen name="PartnerProfile" component={PartnerProfileScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="JobCreate" component={JobCreateScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="Organizations" component={OrganizationsScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="VerifyContact" component={VerifyContactScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Sessions" component={SessionsScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
    </Stack.Navigator>
  </NavigationContainer>;
}
