import { AppLog } from '../logging/logger.js';
import { databaseOperation } from '../database/operation.js';
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';

@Controller()
export class HealthController {
  constructor(@Inject(Pool) private readonly pool: Pool, @Inject(AppLog) private readonly log: AppLog) {}
  @Get('health') health() { return { status: 'ok' }; }
  @Get('ready') async ready() {
    try {
      return await databaseOperation(this.log, 'health.ready', async () => {
      await this.pool.query('SELECT postgis_version()');
      await this.pool.query('SELECT id FROM categories LIMIT 1');
      await this.pool.query('SELECT id FROM skills LIMIT 1');
      await this.pool.query('SELECT id FROM skill_categories LIMIT 1');
      return { status: 'ready' };
      });
    } catch { throw new ServiceUnavailableException(); }
  }
}
