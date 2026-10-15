import {RealtimeGateway} from './modules/realtime/realtime.gateway.js';
import { AppLog } from './logging/logger.js';
import { requestMiddleware } from './common/http/request-context.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import type { Config } from './config/environment.js';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http/http-exception.filter.js';

export async function createApp(settings: Config, database?: Pool, log = new AppLog(undefined, process.env.LOG_LEVEL ?? 'info', process.env.NODE_ENV)) {
  const app = await NestFactory.create(AppModule.register(settings, database, log), { logger: log, abortOnError: false });
  app.use(requestMiddleware(log));
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new HttpExceptionFilter(log));
  if (settings.corsOrigin) app.enableCors({ origin: settings.corsOrigin.split(',').map(x => x.trim()), methods: ['GET','POST','PATCH','PUT'], allowedHeaders: ['Content-Type','Authorization','X-Client-Request-Id','Idempotency-Key'], exposedHeaders: ['X-Request-Id','Retry-After'] });
  if(settings.authSecret&&settings.realtimeEnabled)app.get(RealtimeGateway).attach(app.getHttpServer(),settings.corsOrigin?.split(',').map(s=>s.trim())??[]);
  return app;
}
