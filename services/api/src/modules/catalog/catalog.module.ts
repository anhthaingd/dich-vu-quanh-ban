import { AppLog } from '../../logging/logger.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { Cursor } from './catalog.query.js';

@Module({})
export class CatalogModule {
  static register(cursorSecret: string): DynamicModule {
    return {
      module: CatalogModule,
      controllers: [CatalogController],
      providers: [{
        provide: CatalogService,
        inject: [Pool, AppLog],
        useFactory: (pool: Pool, log: AppLog) => new CatalogService(pool, new Cursor(cursorSecret), log),
      }],
    };
  }
}
