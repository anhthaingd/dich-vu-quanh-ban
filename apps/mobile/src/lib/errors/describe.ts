import type { Locale } from '../i18n';
import { ApiError, type ApiErrorCode } from '../http/api-error';
import { categoryMessages } from './categories';
import { reasonMessage } from './reasons';

// What screens keep in state after a failure: codes only, never translated text.
export type ErrorInfo = { code: ApiErrorCode; reason?: string; field?: string; requestId?: string };

export function toErrorInfo(error: unknown, fallback: ApiErrorCode = 'NETWORK'): ErrorInfo {
  if (error instanceof ApiError) return { code: error.code, ...(error.reason ? { reason: error.reason } : {}), ...(error.field ? { field: error.field } : {}), ...(error.requestId ? { requestId: error.requestId } : {}) };
  return { code: fallback };
}

const asInfo = (error: ErrorInfo | ApiErrorCode): ErrorInfo => typeof error === 'string' ? { code: error } : error;

/**
 * Pick the most precise message: the API reason first, then the screen's own
 * message for this category (`screen`), then the generic category message.
 * `screen` may return undefined to defer to the generic message.
 */
export function errorText(locale: Locale, error: ErrorInfo | ApiErrorCode, screen?: (code: ApiErrorCode) => string | undefined): string {
  const info = asInfo(error);
  return reasonMessage(locale, info.reason) ?? screen?.(info.code) ?? categoryMessages[locale][info.code] ?? categoryMessages[locale].HTTP;
}

/** Short reference for unexpected server failures, so support can find the log line. */
export function errorReference(error: ErrorInfo | ApiErrorCode): string | undefined {
  const info = asInfo(error);
  return info.requestId && ['INTERNAL', 'SERVICE_UNAVAILABLE', 'TIMEOUT', 'HTTP', 'INVALID_RESPONSE'].includes(info.code) ? info.requestId.slice(0, 8).toUpperCase() : undefined;
}
