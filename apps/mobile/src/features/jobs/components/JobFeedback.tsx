import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { useLocale } from '../../../app/providers/LocaleProvider';
import type { ApiErrorCode } from '../../../lib/http/api-error';
import type { ErrorInfo } from '../../../lib/errors/describe';
// Results that may still have been applied on the server.
const uncertain: ApiErrorCode[] = ['NETWORK', 'TIMEOUT', 'INTERNAL', 'SERVICE_UNAVAILABLE', 'HTTP', 'INVALID_RESPONSE'];
// Shows the API reason when there is one; otherwise this screen's text, then the
// generic category text. `screen` lets a screen add its own context per code.
export function JobFeedback({ error, pending, retry, busy, screen }: {
    error: ApiErrorCode | ErrorInfo | null;
    pending?: boolean;
    retry?: () => void;
    busy?: boolean;
    screen?: (code: ApiErrorCode) => string | undefined;
}) {
    const { t } = useLocale();
    if (!error)
        return null;
    const text = (code: ApiErrorCode) => screen?.(code)
        ?? (pending && uncertain.includes(code) ? t('jobs.pending')
            : code === 'VERSION_CONFLICT' || code === 'STATE_CONFLICT' ? t('jobs.conflict')
                : code === 'FORBIDDEN' || code === 'NOT_FOUND' ? t('jobs.denied') : undefined);
    return <><ErrorMessage error={error} screen={text}/>{retry && <Button testID="work-retry" label={t('common.retry')} disabled={busy} onPress={retry}/>}</>;
}
