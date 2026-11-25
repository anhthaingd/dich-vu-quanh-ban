import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import type { ApiErrorCode } from '../../../lib/http/api-error';
import { toErrorInfo, type ErrorInfo } from '../../../lib/errors/describe';

/**
 * `Mutation` keeps only the error code. Wrap its work so the exact API reason
 * is kept beside it (the same wrapped work is reused by Mutation retries).
 */
export function captureError<T>(work: (key: string) => Promise<T>, set: (info: ErrorInfo | null) => void) {
  return async (key: string) => {
    try { const value = await work(key); set(null); return value; }
    catch (e) { set(toErrorInfo(e)); throw e; }
  };
}

/** The captured detail only when it belongs to the code the Mutation reports now. */
export function withDetail(code: ApiErrorCode | null, info: ErrorInfo | null): ErrorInfo | ApiErrorCode | null {
  return !code ? null : info?.code === code ? info : code;
}

const infrastructure: ApiErrorCode[] = ['NETWORK', 'TIMEOUT', 'INTERNAL', 'SERVICE_UNAVAILABLE', 'INVALID_RESPONSE', 'HTTP', 'CONFIG'];

/** Failed write: precise message, then a retry button for the same operation. */
export function ActionError({ error, retry, busy, testID }: { error: ErrorInfo | ApiErrorCode | null; retry?: () => void; busy?: boolean; testID?: string }) {
  const { t } = useLocale();
  if (!error) return null;
  // Screen text only where it adds context; infrastructure codes use the precise category text.
  const screen = (code: ApiErrorCode) => infrastructure.includes(code) ? undefined
    : code === 'VERSION_CONFLICT' || code === 'STATE_CONFLICT' ? t('jobs.conflict')
    : code === 'FORBIDDEN' || code === 'NOT_FOUND' ? t('jobs.denied') : undefined;
  return <><ErrorMessage testID={testID} error={error} screen={screen}/>{retry && <Button testID="work-retry" label={t('common.retry')} disabled={busy} onPress={retry}/>}</>;
}
