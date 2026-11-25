// `code` is the stable category screens branch on. `reason` is the exact cause
// sent by the API (UPPER_SNAKE, e.g. JOB_ALREADY_ACCEPTED) and `field` the input
// at fault; both are optional and only used to pick a precise message.
export type ApiErrorCode = 'ACCOUNT_EXISTS' | 'INVITATION_PENDING' | 'LOCAL_CONTACT_NOT_ALLOWED' | 'CHALLENGE_INVALID' | 'CHALLENGE_EXPIRED' | 'REAUTH_REQUIRED' | 'INSUFFICIENT_POINTS' | 'PARTNER_FUNDING_REQUIRED' | 'STATE_CONFLICT' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_MISMATCH' | 'BUSY' | 'CONFIG' | 'CANCELLED' | 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE' | 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_FOUND' | 'CONFLICT' | 'UNPROCESSABLE' | 'PAYLOAD_TOO_LARGE' | 'INTERNAL' | 'SERVICE_UNAVAILABLE' | 'CALLS_UNAVAILABLE' | 'HTTP';
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, readonly status?: number, readonly requestId?: string, readonly clientRequestId?: string, readonly retryAfter?: number, readonly reason?: string, readonly field?: string) {
    super(code);
    this.name = 'ApiError';
  }
}
