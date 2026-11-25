import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppLog, requestContext } from '../../logging/logger.js';

// Error body: { code, reason?, field_errors?: [{ field, code }], message, correlation_id, retryable }.
// `code` is the stable category clients branch on; `reason` names the exact
// cause (UPPER_SNAKE) so clients can show a precise message; `field` names the
// input at fault (sent as the contract's `field_errors`). Neither ever carries
// user values, ids, SQL or stack traces.
const CATEGORY: Record<number, string> = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 415: 'UNSUPPORTED_MEDIA_TYPE', 422: 'UNPROCESSABLE', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE', 504: 'TIMEOUT' };
// Codes a module may use as the category itself (kept for existing clients).
const CATEGORY_CODES: Record<number, string[]> = {
  400: ['CHALLENGE_INVALID', 'CHALLENGE_EXPIRED'],
  403: ['REAUTH_REQUIRED'],
  409: ['ACCOUNT_EXISTS', 'INVITATION_PENDING', 'VERSION_CONFLICT', 'IDEMPOTENCY_MISMATCH', 'STATE_CONFLICT'],
  422: ['INSUFFICIENT_POINTS', 'PARTNER_FUNDING_REQUIRED'],
  503: ['CALLS_UNAVAILABLE', 'LOCAL_CONTACT_NOT_ALLOWED'],
};
const MESSAGES: Record<number, string> = { 400: 'Tham số không hợp lệ.', 401: 'Không thể xác thực. Vui lòng đăng nhập lại.', 403: 'Bạn không có quyền thực hiện.', 404: 'Không tìm thấy.', 409: 'Dữ liệu đã thay đổi hoặc không còn phù hợp.', 413: 'Dữ liệu gửi lên quá lớn.', 422: 'Chưa đủ điều kiện thực hiện.', 429: 'Thao tác quá nhiều lần. Vui lòng chờ rồi thử lại.' };
const REASON = /^[A-Z][A-Z0-9_]{1,63}$/;
const FIELD = /^[a-z][a-zA-Z0-9_.]{0,63}$/;

export type ErrorDetail = { code: string; reason?: string; field?: string };

export function describeException(error: unknown): { status: number } & ErrorDetail {
  let status = error instanceof HttpException ? error.getStatus() : 500;
  const detail = error instanceof HttpException ? error.getResponse() : null;
  const raw = detail && typeof detail === 'object' ? detail as Record<string, unknown> : {};
  // Body parser failures arrive as plain errors with a 4xx status and a `type`.
  if (!(error instanceof HttpException) && error && typeof error === 'object') {
    const e = error as { status?: unknown; type?: unknown };
    if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) {
      status = e.status;
      const reason = e.type === 'entity.parse.failed' ? 'BODY_INVALID_JSON' : e.type === 'entity.too.large' ? 'BODY_TOO_LARGE' : e.type === 'encoding.unsupported' || e.type === 'charset.unsupported' ? 'BODY_ENCODING_UNSUPPORTED' : undefined;
      return { status, code: CATEGORY[status] ?? 'VALIDATION', ...(reason ? { reason } : {}) };
    }
  }
  const declared = typeof raw.code === 'string' ? raw.code : undefined;
  const category = declared && CATEGORY_CODES[status]?.includes(declared) ? declared : CATEGORY[status] ?? 'INTERNAL';
  // A module may put the exact cause in `reason`, or (legacy) in `code` when it
  // is not one of the category codes, e.g. { code: 'RATE_LIMITED' } on a 429.
  const reasonSource = typeof raw.reason === 'string' ? raw.reason : declared && declared !== category ? declared : undefined;
  // Nest wraps body-parser's PayloadTooLarge as a plain 413 HttpException.
  const fallbackReason = status === 413 ? 'BODY_TOO_LARGE' : undefined;
  const reason = status < 500 || status === 503 ? reasonSource && REASON.test(reasonSource) && reasonSource !== category ? reasonSource : fallbackReason : undefined;
  const field = status < 500 && typeof raw.field === 'string' && FIELD.test(raw.field) ? raw.field : undefined;
  return { status, code: category, ...(reason ? { reason } : {}), ...(field ? { field } : {}) };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly log: AppLog) {}
  catch(error: unknown, host: ArgumentsHost) {
    const { status, code, reason, field } = describeException(error);
    const message = MESSAGES[status] ?? 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.';
    if (status >= 500) this.log.emit('http.exception', { error, code, reason, status_code: status });
    host.switchToHttp().getResponse().status(status).json({ code, ...(reason ? { reason } : {}), ...(field ? { field_errors: [{ field, code: reason ?? code }] } : {}), message, correlation_id: requestContext.getStore()?.request_id, retryable: status >= 500 });
  }
}
