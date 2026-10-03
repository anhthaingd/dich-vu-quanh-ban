import { ActivityIndicator } from 'react-native';
import { Card } from './Card';
import { AppText } from './AppText';
import { Button } from './Button';
import { theme } from '../../theme/tokens';
export function LoadingState({ message }: { message: string }) {
  return <Card accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
    <ActivityIndicator color={theme.colors.primary} /><AppText>{message}</AppText>
  </Card>;
}
export function EmptyState({ message }: { message: string }) {
  return <Card><AppText>{message}</AppText></Card>;
}
export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return <Card accessibilityLiveRegion="polite">
    <AppText accessibilityRole="alert" tone="error">{message}</AppText>
    <Button label={retryLabel} onPress={onRetry} />
  </Card>;
}
