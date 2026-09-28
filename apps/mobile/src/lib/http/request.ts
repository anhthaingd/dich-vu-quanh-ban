import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from './api-error';
import { diagnostics, type DiagnosticLogger } from '../logging/logger';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function requestJson(url: string, request: typeof fetch, signal?: AbortSignal, logger: DiagnosticLogger = diagnostics, validate?: (data: unknown) => boolean): Promise<unknown> {
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
      const response = await request(url, { signal: controller.signal, headers: { 'X-Client-Request-Id': clientId } });
      status = response.status;
      const id = response.headers?.get('x-request-id');
      if (id && uuid.test(id)) requestId = id;
      if (!response.ok) {
        const codes: Record<number, ApiErrorCode> = { 400: 'VALIDATION', 404: 'NOT_FOUND', 500: 'INTERNAL', 503: 'SERVICE_UNAVAILABLE' };
        throw new ApiError(codes[status] ?? 'HTTP', status, requestId, clientId);
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
