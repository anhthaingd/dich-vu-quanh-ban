import { useLocale } from '../../app/providers/LocaleProvider';
import type { ApiErrorCode } from '../../lib/http/api-error';
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

// A failed read never implies that a send or another mutation should be retried.
export function RefreshError({ error, retry, busy }: { error: ApiErrorCode | null; retry: () => void; busy: boolean }) {
  const { t } = useLocale();
  if (!error) return null;
  const denied = ['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(error);
  return <><AppText accessibilityRole="alert" tone="error">{t(denied ? 'jobs.denied' : 'common.refreshFailed')}</AppText>
    <Button testID="refresh-retry" label={t('common.retry')} disabled={busy} onPress={retry}/></>;
}
