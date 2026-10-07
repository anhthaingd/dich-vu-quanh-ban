import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { useLocale } from '../../../app/providers/LocaleProvider';
import type { ApiErrorCode } from '../../../lib/http/api-error';
export function JobFeedback({ error, pending, retry, busy }: {
    error: ApiErrorCode | null;
    pending?: boolean;
    retry?: () => void;
    busy?: boolean;
}) {
    const { t } = useLocale();
    if (!error)
        return null;
    const key = error === 'VERSION_CONFLICT' || error === 'STATE_CONFLICT' ? 'jobs.conflict' : error === 'FORBIDDEN' || error === 'NOT_FOUND' ? 'jobs.denied' : error === 'VALIDATION' ? 'jobs.invalid' : pending ? 'jobs.pending' : 'jobs.error';
    return <><AppText accessibilityRole="alert" tone="error">{t(key)}</AppText>{retry && <Button testID="work-retry" label={t('common.retry')} disabled={busy} onPress={retry}/>}</>;
}
