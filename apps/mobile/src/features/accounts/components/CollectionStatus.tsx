import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Feedback';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import type { ApiErrorCode } from '../../../lib/http/api-error';
import type { ErrorInfo } from '../../../lib/errors/describe';
export function CollectionStatus({ state, retry, reload, blocked = false }: { blocked?: boolean; state: { busy: boolean; pending: boolean; error: ApiErrorCode | null; errorInfo?: ErrorInfo | null; saved: boolean }; retry: () => void; reload: () => void }) {
  const { t } = useLocale();
  return <>
    {state.busy && <LoadingState message={t('accountTools.loading')} />}
    <ErrorMessage error={state.error ? state.errorInfo ?? state.error : null} screen={code => code === 'VERSION_CONFLICT' ? t('accountTools.conflict') : code === 'VALIDATION' ? t('accountTools.invalid') : undefined} />
    {state.saved && <AppText testID="account-saved" accessibilityLiveRegion="polite">{t('accountTools.saved')}</AppText>}
    {state.pending ? <><AppText>{t('accountTools.pending')}</AppText><Button testID="account-retry" label={t('common.retry')} disabled={state.busy || blocked} onPress={retry} /></>
      : <Button testID="account-reload" label={t('accountTools.reload')} variant="secondary" disabled={state.busy || blocked} onPress={reload} />}
  </>;
}
