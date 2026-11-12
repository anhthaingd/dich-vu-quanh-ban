import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppLog, requestContext } from '../../logging/logger.js';
import { loggedRoute, uuid } from '../../logging/sanitize.js';
export function requestMiddleware(log: AppLog) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const supplied = req.headers['x-client-request-id'];
    const context = { request_id: randomUUID(), ...(typeof supplied === 'string' && uuid.test(supplied) ? { client_request_id: supplied } : {}) };
    res.setHeader('X-Request-Id', context.request_id);
    const start = performance.now();
    const path = (req.url ?? '').split('?')[0];
    let ended = false;
    const end = (aborted: boolean) => {
      if (ended) return;
      ended = true;
      requestContext.run(context, () => log.emit(aborted ? 'http.aborted' : 'http.completed', {
        // The router sets req.route after this middleware; read it when the response ends.
        method: req.method, route: loggedRoute((req as IncomingMessage & { route?: { path?: unknown } }).route?.path, path), status_code: aborted ? undefined : res.statusCode, duration_ms: performance.now() - start,
      }));
    };
    res.once('finish', () => end(false));
    res.once('close', () => end(!res.writableFinished));
    requestContext.run(context, next);
  };
}
