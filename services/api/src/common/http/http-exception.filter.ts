import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppLog, requestContext } from '../../logging/logger.js';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly log: AppLog) {}
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const codes: Record<number, string> = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE', 504: 'TIMEOUT' };
    const detail = error instanceof HttpException ? error.getResponse() : null;
    const conflict = detail && typeof detail === 'object' && 'code' in detail ? detail.code : null;
    const code = status===400 && (conflict==='CHALLENGE_INVALID'||conflict==='CHALLENGE_EXPIRED') ? conflict : status===403 && conflict==='REAUTH_REQUIRED' ? conflict : status === 409 && (conflict === 'VERSION_CONFLICT' || conflict === 'IDEMPOTENCY_MISMATCH' || conflict === 'STATE_CONFLICT') ? conflict : status === 422 && (conflict === 'INSUFFICIENT_POINTS' || conflict === 'PARTNER_FUNDING_REQUIRED') ? conflict : codes[status] ?? 'INTERNAL';
    const messages: Record<number, string> = { 400: 'Tham số không hợp lệ.', 401: 'Không thể xác thực. Vui lòng đăng nhập lại.', 403: 'Bạn không có quyền thực hiện.', 404: 'Không tìm thấy.', 429: 'Thao tác quá nhiều lần. Vui lòng chờ rồi thử lại.' };
    const message = messages[status] ?? 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.';
    if (status >= 500) this.log.emit('http.exception', { error, code, status_code: status });
    host.switchToHttp().getResponse().status(status).json({ code, message, correlation_id: requestContext.getStore()?.request_id, retryable: status >= 500 });
  }
}
