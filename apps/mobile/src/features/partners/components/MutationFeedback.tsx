import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { toErrorInfo, type ErrorInfo } from '../../../lib/errors/describe';
import type { ApiErrorCode } from '../../../lib/http/api-error';
import { JobFeedback } from '../../jobs/components/JobFeedback';

/** Run a mutation's work and keep its full failure (code + API reason) for display. */
export function captured<T>(set: (info: ErrorInfo | null) => void, work: () => Promise<T>): Promise<T> {
  set(null);
  return work().catch((e: unknown) => { set(toErrorInfo(e)); throw e; });
}

// The shared Mutation keeps only the error code. When the same failure was
// captured with its API reason, show the exact message; otherwise JobFeedback.
export function MutationFeedback({ error, info, pending, busy, retry }: {
  error: ApiErrorCode | null; info: ErrorInfo | null; pending?: boolean; busy?: boolean; retry?: () => void;
}) {
  const { t } = useLocale();
  if (!error) return null;
  if (!info?.reason || info.code !== error) return <JobFeedback error={error} pending={pending} busy={busy} retry={retry} />;
  return <>
    <ErrorMessage error={info} />
    {retry && <Button testID="work-retry" label={t('common.retry')} disabled={busy} onPress={retry} />}
  </>;
}
