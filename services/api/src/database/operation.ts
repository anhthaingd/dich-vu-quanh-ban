import { ServiceUnavailableException } from '@nestjs/common';
import { AppLog } from '../logging/logger.js';
const unavailable = new Set(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENOTFOUND','EPIPE','53300','53400','57P01','57P02','57P03','57014','08000','08003','08006']);
export async function databaseOperation<T>(log: AppLog, operation: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await run();
    const duration_ms = performance.now() - start;
    log.emit(duration_ms >= 500 ? 'db.slow' : 'db.completed', { operation, duration_ms });
    return result;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    log.emit(code && unavailable.has(code) ? 'db.unavailable' : 'db.operation_failed', { operation, code, error, duration_ms: performance.now() - start });
    if (code && unavailable.has(code)) throw new ServiceUnavailableException(undefined, { cause: error });
    // pg's connection timeout has no code; classify at the driver boundary only.
    if (error instanceof Error && /^Connection terminated due to connection timeout$|^timeout exceeded when trying to connect$/.test(error.message)) throw new ServiceUnavailableException(undefined, { cause: error });
    throw error;
  }
}
