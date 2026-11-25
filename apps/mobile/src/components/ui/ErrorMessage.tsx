import { useCallback } from 'react';
import { useLocale } from '../../app/providers/LocaleProvider';
import type { ApiErrorCode } from '../../lib/http/api-error';
import { errorReference, errorText, type ErrorInfo } from '../../lib/errors/describe';
import { AppText } from './AppText';

/** Translate a stored error at render time (state keeps codes, not sentences). */
export function useErrorText() {
  const { locale } = useLocale();
  return useCallback((error: ErrorInfo | ApiErrorCode, screen?: (code: ApiErrorCode) => string | undefined) => errorText(locale, error, screen), [locale]);
}

/** Precise error line plus a reference code for unexpected server failures. */
export function ErrorMessage({ error, screen, testID }: { error: ErrorInfo | ApiErrorCode | null | undefined; screen?: (code: ApiErrorCode) => string | undefined; testID?: string }) {
  const { t } = useLocale();
  const text = useErrorText();
  if (!error) return null;
  const reference = errorReference(error);
  return <>
    <AppText testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite" tone="error">{text(error, screen)}</AppText>
    {reference && <AppText variant="caption" tone="muted" selectable>{t('errors.reference', { code: reference })}</AppText>}
  </>;
}
