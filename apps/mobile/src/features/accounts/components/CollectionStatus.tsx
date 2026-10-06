import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Feedback';
import type { ApiErrorCode } from '../../../lib/http/api-error';
export function CollectionStatus({ state, retry, reload }: { state: { busy: boolean; pending: boolean; error: ApiErrorCode | null; saved: boolean }; retry: () => void; reload: () => void }) {
  const { t } = useLocale();
  return <>
    {state.busy && <LoadingState message={t('accountTools.loading')} />}
    {state.error && <AppText accessibilityRole="alert" tone="error">{t(state.error === 'VERSION_CONFLICT' ? 'accountTools.conflict' : state.error === 'VALIDATION' ? 'accountTools.invalid' : 'accountTools.error')}</AppText>}
    {state.saved && <AppText testID="account-saved" accessibilityLiveRegion="polite">{t('accountTools.saved')}</AppText>}
    {state.pending ? <><AppText>{t('profile.pending')}</AppText><Button testID="account-retry" label={t('common.retry')} disabled={state.busy} onPress={retry} /></>
      : <Button testID="account-reload" label={t('accountTools.reload')} variant="secondary" disabled={state.busy} onPress={reload} />}
  </>;
}
