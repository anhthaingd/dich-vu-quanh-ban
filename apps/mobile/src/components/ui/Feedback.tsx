import { useLocale } from '../../app/providers/LocaleProvider';
import type { ApiErrorCode } from '../../lib/http/api-error';
import type { ErrorInfo } from '../../lib/errors/describe';
import { ErrorMessage } from './ErrorMessage';
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
// Accepts a bare code (legacy) or ErrorInfo so the API reason can be shown.
export function RefreshError({ error, retry, busy }: { error: ApiErrorCode | ErrorInfo | null; retry: () => void; busy: boolean }) {
  const { t } = useLocale();
  if (!error) return null;
  const code = typeof error === 'string' ? error : error.code;
  const denied = ['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(code);
  return <><ErrorMessage error={error} screen={c => c === 'BUSY' ? t('common.refreshBusy') : denied ? t('jobs.denied') : ['NETWORK', 'TIMEOUT'].includes(c) ? t('common.refreshFailed') : undefined}/>
    <Button testID="refresh-retry" label={t('common.retry')} disabled={busy} onPress={retry}/></>;
}
