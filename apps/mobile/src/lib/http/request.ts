import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from './api-error';
import { diagnostics, type DiagnosticLogger } from '../logging/logger';
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
        const codes: Record<number, ApiErrorCode> = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED', 500: 'INTERNAL', 503: 'SERVICE_UNAVAILABLE', 504: 'TIMEOUT' };
        let code = codes[status] ?? 'HTTP';
        if (status === 400 || status === 403 || status === 409 || status === 422) {
          try {
            const body: unknown = await response.json();
            const conflict = body && typeof body === 'object' && 'code' in body ? body.code : null;
            if (conflict === 'CHALLENGE_INVALID' || conflict === 'CHALLENGE_EXPIRED' || conflict === 'REAUTH_REQUIRED' || conflict === 'STATE_CONFLICT' || conflict === 'VERSION_CONFLICT' || conflict === 'IDEMPOTENCY_MISMATCH' || conflict === 'INSUFFICIENT_POINTS' || conflict === 'PARTNER_FUNDING_REQUIRED') code = conflict;
          } catch { /* Unknown error bodies stay generic and never enter logs. */ }
        }
        const retry = Number(response.headers?.get('retry-after'));
        throw new ApiError(code, status, requestId, clientId, status === 429 && Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 86400) : undefined);
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
