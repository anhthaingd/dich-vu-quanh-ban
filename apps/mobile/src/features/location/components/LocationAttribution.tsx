import { Linking } from 'react-native';
import { AppText } from '../../../components/ui/AppText';

export function LocationAttribution() {
  return <AppText variant="caption" tone="muted">
    Powered by <AppText variant="caption" accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.geoapify.com/').catch(() => {}); }}>Geoapify</AppText>
    {' · '}<AppText variant="caption" accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {}); }}>© OpenStreetMap contributors</AppText>
  </AppText>;
}
