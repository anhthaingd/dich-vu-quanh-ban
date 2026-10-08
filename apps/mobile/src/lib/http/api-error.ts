export type ApiErrorCode = 'INSUFFICIENT_POINTS' | 'PARTNER_FUNDING_REQUIRED' | 'STATE_CONFLICT' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_MISMATCH' | 'BUSY' | 'CONFIG' | 'CANCELLED' | 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE' | 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_FOUND' | 'INTERNAL' | 'SERVICE_UNAVAILABLE' | 'HTTP';
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, readonly status?: number, readonly requestId?: string, readonly clientRequestId?: string, readonly retryAfter?: number) {
    super(code);
    this.name = 'ApiError';
  }
}
