import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AppLog } from '../../logging/logger.js';
import { AuthService } from '../auth/auth.service.js';
import { PartnersService } from './partners.service.js';
import { PartnersController } from './partners.controller.js';
import { SearchService } from '../search/search.service.js';
import { SearchCursor } from '../search/search.query.js';
@Module({})
export class PartnersModule {
  static register(cursorSecret: string): DynamicModule {
    return {
      module: PartnersModule,
      controllers: [PartnersController],
      providers: [
        {
          provide: PartnersService,
          inject: [Pool, AuthService],
          useFactory: (pool: Pool, auth: AuthService) =>
            new PartnersService(pool, auth)
        },
        {
          provide: SearchService,
          inject: [Pool, AppLog],
          useFactory: (pool: Pool, log: AppLog) =>
            new SearchService(pool, new SearchCursor(cursorSecret), log)
        }
      ]
    };
  }
}
