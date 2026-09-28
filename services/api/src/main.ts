import { createApp } from './bootstrap.js';
import { config } from './config/environment.js';
import { AppLog } from './logging/logger.js';
import { fileOutput } from './logging/output.js';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
let log = new AppLog(undefined, 'info', process.env.NODE_ENV);
let output: Awaited<ReturnType<typeof fileOutput>> | undefined;
let app: INestApplication | undefined;
let closing = false;
let outputFailed = false;
async function close() {
  if (closing) return;
  closing = true;
  try { await app?.close(); log.emit('app.stopped'); await log.flush(); await output?.close(); }
  catch { process.exitCode = 1; }
}
try {
  const settings = config();
  if (process.env.LOG_TO_FILE === '1') output = await fileOutput(resolve(process.cwd(), '../../.local/logs'), () => { outputFailed = true; process.exitCode = 1; log = new AppLog(); log.emit('app.start_failed'); if (app) void close(); });
  log = new AppLog(output, process.env.LOG_LEVEL ?? 'info', process.env.NODE_ENV);
  app = await createApp(settings, undefined, log);
  if (outputFailed) throw new Error('Log output unavailable');
  await app.listen(settings.port, settings.host);
  log.emit('app.started');
  for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => { void close(); });
} catch (error) {
  log.emit('app.start_failed', { error }); process.exitCode = 1; await close();
}
