export const events = {
  'app.started': 'info', 'app.start_failed': 'fatal', 'app.stopped': 'info',
  'framework.message': 'debug', 'framework.error': 'error',
  'http.completed': 'info', 'http.aborted': 'info', 'http.exception': 'error',
  'db.completed': 'debug', 'db.slow': 'warn', 'db.unavailable': 'error',
  'db.migration.completed': 'info', 'db.seed.completed': 'info', 'db.catalog.replaced': 'info', 'db.operation_failed': 'error',
} as const;
export type Event = keyof typeof events;
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export function severity(event: Event, status = 200, route = ''): Level {
  if (event === 'http.completed') return status >= 500 ? 'error' : status >= 400 ? 'warn' : route === '/v1/health' || route === '/v1/ready' ? 'debug' : 'info';
  return events[event];
}
