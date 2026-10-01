export type ApiErrorCode = 'CONFIG' | 'CANCELLED' | 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE' | 'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_FOUND' | 'INTERNAL' | 'SERVICE_UNAVAILABLE' | 'HTTP';
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, readonly status?: number, readonly requestId?: string, readonly clientRequestId?: string) {
    super(code === 'CONFIG' ? 'Chưa cấu hình địa chỉ dịch vụ.' : code === 'INVALID_RESPONSE' ? 'Phản hồi dịch vụ không hợp lệ.' : 'Không tải được danh mục. Vui lòng thử lại.');
    this.name = 'ApiError';
  }
}
