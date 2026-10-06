import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthModule } from '../auth/auth.module.js';
import { AuthService } from '../auth/auth.service.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
@Module({})
export class AccountsModule {
  static register(secret: string): DynamicModule {
    return { module: AccountsModule, imports: [AuthModule.register(secret)], controllers: [AccountsController], providers: [
      { provide: AccountsService, inject: [Pool, AuthService], useFactory: (pool: Pool, auth: AuthService) => new AccountsService(pool, auth) },
    ] };
  }
}
