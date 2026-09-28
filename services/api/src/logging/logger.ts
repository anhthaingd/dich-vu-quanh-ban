import { AsyncLocalStorage } from 'node:async_hooks';
import { pino, type DestinationStream, type Logger as Pino } from 'pino';
import type { LoggerService } from '@nestjs/common';
import { events, severity, type Event } from './events.js';
import { sanitize, type Metadata } from './sanitize.js';
export const requestContext = new AsyncLocalStorage<{ request_id: string; client_request_id?: string }>();
export class AppLog implements LoggerService {
  readonly root: Pino;
  constructor(destination?: DestinationStream, level = 'info', environment = 'development') {
    this.root = pino({
      level, base: { service: 'api', environment: ['development','test','production'].includes(environment) ? environment : 'development', version: '0.1.0' },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: { level: label => ({ level: label }) },
      serializers: { req: () => undefined, res: () => undefined },
      redact: { paths: ['authorization','cookie','password','token','body','query','headers'], remove: true },
      hooks: { logMethod(args, method) {
        const input = typeof args[0] === 'object' && args[0] !== null ? args[0] as Metadata & { event?: string } : {};
        const event = input.event && Object.hasOwn(events, input.event) ? input.event as Event : 'framework.message';
        method.call(this, { ...sanitize(input), ...requestContext.getStore(), event, context: event.split('.')[0], message: event });
      } },
    }, destination);
  }
  emit(event: Event, data: Metadata = {}) { this.root[severity(event, data.status_code, data.route)]({ ...data, event }); }
  log() { this.emit('framework.message'); }
  warn() { this.emit('framework.message'); }
  debug() { this.emit('framework.message'); }
  verbose() { this.emit('framework.message'); }
  error(error: unknown) { this.emit('framework.error', { error }); }
  fatal(error: unknown) { this.emit('app.start_failed', { error }); }
  async flush() { await new Promise<void>((resolve, reject) => this.root.flush(error => error ? reject(error) : resolve())); }
}
