const levels = { 'request.failed': 'error', 'request.timeout': 'warn', 'response.invalid': 'error', 'request.cancelled': 'debug', 'request.retry': 'info' } as const;
export type MobileEvent = keyof typeof levels;
export interface DiagnosticMetadata { request_id?: string; client_request_id?: string; status_code?: number; duration_ms?: number }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createDiagnosticLogger(sink?: (line: string) => void) {
  const buffer: string[] = [];
  return {
    emit(event: MobileEvent, data: DiagnosticMetadata = {}) {
      if (!Object.hasOwn(levels, event)) return;
      const metadata: DiagnosticMetadata = {};
      for (const key of ['request_id','client_request_id'] as const) if (typeof data[key] === 'string' && uuid.test(data[key])) metadata[key] = data[key];
      if (Number.isInteger(data.status_code) && data.status_code! >= 100 && data.status_code! <= 599) metadata.status_code = data.status_code;
      if (typeof data.duration_ms === 'number' && Number.isFinite(data.duration_ms) && data.duration_ms >= 0) metadata.duration_ms = Math.round(Math.min(data.duration_ms, 86400000));
      const line = JSON.stringify({ timestamp: new Date().toISOString(), level: levels[event], event, service: 'mobile', version: '0.1.0', context: 'http', message: event, ...metadata });
      // Allowlisted ASCII fields bound records well below 2 KB without truncating JSON.
      buffer.push(line); if (buffer.length > 200) buffer.shift();
      try { sink?.(line); } catch { /* Diagnostics must not break user requests. */ }
    },
    exportJsonl: () => buffer.length ? buffer.join('\n') + '\n' : '',
    clear: () => { buffer.length = 0; },
  };
}
export const diagnostics = createDiagnosticLogger(typeof __DEV__ !== 'undefined' && __DEV__ && process.env.NODE_ENV !== 'test' ? line => console.debug(line) : undefined);
export type DiagnosticLogger = ReturnType<typeof createDiagnosticLogger>;
