import {RuntimeLease} from './database/runtime-lease.js';
import {RealtimeGateway} from './modules/realtime/realtime.gateway.js';
import { AppLog } from './logging/logger.js';
import { requestMiddleware } from './common/http/request-context.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config/environment.js';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http/http-exception.filter.js';

export async function createApp(settings: Config, database?: Pool, log = new AppLog(undefined, process.env.LOG_LEVEL ?? 'info', process.env.NODE_ENV)) {
  const app = await NestFactory.create(AppModule.register(settings, database, log), { logger: log, abortOnError: false });
  const lease=app.get(RuntimeLease);
  try{await lease.acquire();}catch(e){await app.close();throw e;}
  if(settings.labRealtime)app.use((req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
    if(!lease.ready&&req.url!=='/v1/health'){res.statusCode=503;res.end();return;}next();
  });
  // These paths require SG/listener rules blocking shorter routes to the API.
  // CloudFront appends the viewer IP; ALB appends its CloudFront peer. Express
  // selects from the right, so viewer-controlled XFF prefixes cannot reset quotas.
  if(settings.trustProxy)app.getHttpAdapter().getInstance().set('trust proxy',settings.proxyMode==='cloudfront-alb'?2:1);
  if(settings.trustProxy && settings.proxyMode==='cloudfront-alb'){
    // Lab viewers must use HTTPS, while CloudFront -> private ALB uses HTTP.
    // ALB reports that internal protocol; never interpret it or a viewer's header
    // as the public protocol. This does not claim TLS on the private origin hop.
    app.use((req:IncomingMessage,_res:ServerResponse,next:()=>void)=>{
      req.headers['x-forwarded-proto']='https';
      next();
    });
  }
  app.use(requestMiddleware(log));
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new HttpExceptionFilter(log));
  if (settings.corsOrigin) app.enableCors({ origin: settings.corsOrigin.split(',').map(x => x.trim()), methods: ['GET','POST','PATCH','PUT'], allowedHeaders: ['Content-Type','Authorization','X-Client-Request-Id','Idempotency-Key','X-Admin-Session','X-Recovery-Token'], exposedHeaders: ['X-Request-Id','Retry-After'] });
  if(settings.authSecret&&settings.realtimeEnabled)app.get(RealtimeGateway).attach(app.getHttpServer(),settings.corsOrigin?.split(',').map(s=>s.trim())??[]);
  return app;
}
