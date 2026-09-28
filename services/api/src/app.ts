import 'reflect-metadata';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpException, Inject, Module, Query, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { Config } from './config.js';
import { CatalogService } from './catalog/service.js';
import { Cursor, parseQuery } from './catalog/query.js';

@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const code = status === 400 ? 'VALIDATION' : status === 404 ? 'NOT_FOUND' : 'SERVICE_UNAVAILABLE';
    const message = status === 400 && error instanceof HttpException ? error.message : status === 404 ? 'Không tìm thấy.' : 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại.';
    host.switchToHttp().getResponse().status(status).json({ code, message, correlation_id: randomUUID(), retryable: status >= 500 });
  }
}
@Controller()
class CatalogController {
  constructor(@Inject(CatalogService) private readonly service: CatalogService, @Inject(Pool) private readonly pool: Pool) {}
  @Get('categories') categories(@Query() query: Record<string, unknown>) { return this.service.list('categories', parseQuery(query, 'categories')); }
  @Get('skills') skills(@Query() query: Record<string, unknown>) { return this.service.list('skills', parseQuery(query, 'skills')); }
  @Get('health') health() { return { status: 'ok' }; }
  @Get('ready') async ready() {
    try {
      await this.pool.query('SELECT postgis_version()');
      await this.pool.query('SELECT id FROM categories LIMIT 1');
      await this.pool.query('SELECT id FROM skills LIMIT 1');
      await this.pool.query('SELECT id FROM skill_categories LIMIT 1');
      return { status: 'ready' };
    } catch { throw new ServiceUnavailableException(); }
  }
}
export async function createApp(settings: Config, database?: Pool) {
  const pool = database ?? new Pool({ connectionString: settings.databaseUrl, max: 5, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
  // Do not log connection strings or database errors containing credentials.
  pool.on('error', () => console.error('Database connection unavailable'));
  @Module({ controllers: [CatalogController], providers: [
    { provide: Pool, useValue: pool },
    { provide: CatalogService, useValue: new CatalogService(pool, new Cursor(settings.cursorSecret)) },
    { provide: 'DB_LIFECYCLE', useValue: { onApplicationShutdown: async () => { if (!database) await pool.end(); } } },
  ] })
  class AppModule {}
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new Errors());
  if (settings.corsOrigin) app.enableCors({ origin: settings.corsOrigin.split(',').map(x => x.trim()), methods: ['GET'] });
  app.enableShutdownHooks();
  return app;
}
