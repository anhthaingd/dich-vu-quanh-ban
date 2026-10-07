import { Global, Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
@Global()
@Module({})
export class AuthModule {
  static register(secret: string): DynamicModule {
    if (secret.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
    return { module: AuthModule, exports: [AuthService], controllers: [AuthController], providers: [
      { provide: AuthService, inject: [Pool], useFactory: (pool: Pool) => new AuthService(pool, secret) },
    ] };
  }
}
