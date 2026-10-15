import {RealtimeModule} from './modules/realtime/realtime.module.js';
import {NotificationsModule} from './modules/notifications/notifications.module.js';
import {OrganizationsModule} from './modules/organizations/organizations.module.js';
import {AssetsModule} from './modules/assets/assets.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PartnersModule } from './modules/partners/partners.module.js';
import { AppLog } from './logging/logger.js';
import { LoggingModule } from './logging/logging.module.js';
import { Module, type DynamicModule } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Config } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { HealthModule } from './health/health.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';

@Module({})
export class AppModule {
  static register(settings: Config, database: Pool | undefined, log: AppLog): DynamicModule {
    return {
      module: AppModule,
      imports: [LocationsModule.register(settings.geoapifyKey), LoggingModule.register(log), DatabaseModule.register(settings, database, log), CatalogModule.register(settings.cursorSecret), HealthModule,
        ...(settings.authSecret ? [AuthModule.register(settings.authSecret,settings.localMessages), ...(settings.realtimeEnabled?[RealtimeModule]:[]), NotificationsModule.register(settings.cursorSecret), AccountsModule.register(settings.cursorSecret), OrganizationsModule.register(settings.cursorSecret), InvoicesModule.register(settings.cursorSecret), AssetsModule.register(settings.authSecret,settings.localAssets), PartnersModule.register(settings.cursorSecret), JobsModule.register(settings.cursorSecret), ChatModule.register(settings.cursorSecret)] : [])],
    };
  }
}
