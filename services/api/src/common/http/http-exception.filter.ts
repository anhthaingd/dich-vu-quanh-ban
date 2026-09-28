import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppLog, requestContext } from '../../logging/logger.js';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly log: AppLog) {}
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const code = status === 400 ? 'VALIDATION' : status === 404 ? 'NOT_FOUND' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL';
    const message = status === 400 ? 'Tham số không hợp lệ.' : status === 404 ? 'Không tìm thấy.' : 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.';
    if (status >= 500) this.log.emit('http.exception', { error, code, status_code: status });
    host.switchToHttp().getResponse().status(status).json({ code, message, correlation_id: requestContext.getStore()?.request_id, retryable: status >= 500 });
  }
}
