import { AppLog } from './logging/logger.js';
import { LoggingModule } from './logging/logging.module.js';
import { Module, type DynamicModule } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Config } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { HealthModule } from './health/health.module.js';

@Module({})
export class AppModule {
  static register(settings: Config, database: Pool | undefined, log: AppLog): DynamicModule {
    return {
      module: AppModule,
      imports: [LoggingModule.register(log), DatabaseModule.register(settings, database, log), CatalogModule.register(settings.cursorSecret), HealthModule],
    };
  }
}
