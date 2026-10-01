import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppLog, requestContext } from '../../logging/logger.js';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly log: AppLog) {}
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const codes: Record<number, string> = { 400: 'VALIDATION', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE' };
    const code = codes[status] ?? 'INTERNAL';
    const messages: Record<number, string> = { 400: 'Tham số không hợp lệ.', 401: 'Không thể xác thực. Vui lòng đăng nhập lại.', 403: 'Bạn không có quyền thực hiện.', 404: 'Không tìm thấy.', 429: 'Thao tác quá nhiều lần. Vui lòng chờ rồi thử lại.' };
    const message = messages[status] ?? 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.';
    if (status >= 500) this.log.emit('http.exception', { error, code, status_code: status });
    host.switchToHttp().getResponse().status(status).json({ code, message, correlation_id: requestContext.getStore()?.request_id, retryable: status >= 500 });
  }
}
