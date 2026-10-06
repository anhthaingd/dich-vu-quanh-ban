import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthModule } from '../auth/auth.module.js';
import { AuthService } from '../auth/auth.service.js';
import { AccountsController } from './accounts.controller.js';
import { Cursor } from '../../common/http/cursor.js';
import { AddressesService } from './addresses.service.js';
import { SessionsService } from './sessions.service.js';
import { AccountsService } from './accounts.service.js';
@Module({})
export class AccountsModule {
  static register(secret: string, cursorSecret: string): DynamicModule {
    return { module: AccountsModule, imports: [AuthModule.register(secret)], controllers: [AccountsController], providers: [
      ...[AddressesService, SessionsService].map(provide => ({ provide, inject: [Pool, AuthService], useFactory: (pool: Pool, auth: AuthService) => new provide(pool, auth, new Cursor(cursorSecret)) })),
      { provide: AccountsService, inject: [Pool, AuthService], useFactory: (pool: Pool, auth: AuthService) => new AccountsService(pool, auth) },
    ] };
  }
}
