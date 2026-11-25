import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from './api-error';
import { diagnostics, type DiagnosticLogger } from '../logging/logger';
// Category codes the API may send in place of the status category.
const categories: Record<number, ApiErrorCode[]> = { 400: ['VALIDATION', 'CHALLENGE_INVALID', 'CHALLENGE_EXPIRED'], 403: ['FORBIDDEN', 'REAUTH_REQUIRED'], 409: ['CONFLICT', 'ACCOUNT_EXISTS', 'INVITATION_PENDING', 'STATE_CONFLICT', 'VERSION_CONFLICT', 'IDEMPOTENCY_MISMATCH'], 422: ['UNPROCESSABLE', 'INSUFFICIENT_POINTS', 'PARTNER_FUNDING_REQUIRED'], 503: ['SERVICE_UNAVAILABLE', 'CALLS_UNAVAILABLE', 'LOCAL_CONTACT_NOT_ALLOWED'] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type JsonRequestOptions = { headers?: Record<string, string> } & (
  { method?: 'GET'; body?: never } | { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }
);
export async function requestJson(url: string, request: typeof fetch, signal?: AbortSignal, logger: DiagnosticLogger = diagnostics, validate?: (data: unknown) => boolean, options: JsonRequestOptions = {}): Promise<unknown> {
  const clientId = randomUUID();
  const controller = new AbortController();
  const start = Date.now();
  let requestId: string | undefined;
  let status: number | undefined;
  let timedOut = false;
  let rejectAbort!: (error: ApiError) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const abort = () => {
    rejectAbort(new ApiError(timedOut ? 'TIMEOUT' : 'CANCELLED', status, requestId, clientId));
    controller.abort();
  };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; abort(); }, 10000);
  try {
    if (signal?.aborted) throw new ApiError('CANCELLED', undefined, undefined, clientId);
    return await Promise.race([aborted, (async () => {
      const headers = Object.fromEntries(Object.entries(options.headers ?? {}).filter(([key]) => !['x-client-request-id', 'content-type'].includes(key.toLowerCase())));
      const response = await request(url, { method: options.method ?? 'GET', signal: controller.signal,
        headers: { ...headers, 'X-Client-Request-Id': clientId, ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      status = response.status;
      const id = response.headers?.get('x-request-id');
      if (id && uuid.test(id)) requestId = id;
      if (!response.ok) {
        const codes: Record<number, ApiErrorCode> = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 422: 'UNPROCESSABLE', 429: 'RATE_LIMITED', 500: 'INTERNAL', 503: 'SERVICE_UNAVAILABLE', 504: 'TIMEOUT' };
        let code = codes[status] ?? 'HTTP';
        let reason: string | undefined, field: string | undefined;
        try {
          const body: unknown = await response.json();
          if (body && typeof body === 'object') {
            const b = body as Record<string, unknown>;
            const declared = typeof b.code === 'string' ? b.code : null;
            if (declared && (categories[status] ?? []).includes(declared as ApiErrorCode)) code = declared as ApiErrorCode;
            if (typeof b.reason === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(b.reason)) reason = b.reason;
            const first: unknown = Array.isArray(b.field_errors) ? b.field_errors[0] : undefined;
            const named = first && typeof first === 'object' ? (first as Record<string, unknown>).field : undefined;
            if (typeof named === 'string' && /^[a-z][a-zA-Z0-9_.]{0,63}$/.test(named)) field = named;
          }
        } catch { /* Unknown error bodies stay generic and never enter logs. */ }
        const retry = Number(response.headers?.get('retry-after'));
        throw new ApiError(code, status, requestId, clientId, status === 429 && Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 86400) : undefined, reason, field);
      }
      try { const data: unknown = await response.json(); if (validate && !validate(data)) throw new Error('Invalid response'); return data; } catch { throw new ApiError('INVALID_RESPONSE', status, requestId, clientId); }
    })()]);
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : new ApiError('NETWORK', status, requestId, clientId);
    logger.emit(error.code === 'CANCELLED' ? 'request.cancelled' : error.code === 'TIMEOUT' ? 'request.timeout' : error.code === 'INVALID_RESPONSE' ? 'response.invalid' : 'request.failed', {
      request_id: requestId, client_request_id: clientId, status_code: status, duration_ms: Date.now() - start,
    });
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
