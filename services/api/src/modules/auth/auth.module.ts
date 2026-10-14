import {ChallengesController} from './challenges.controller.js';
import {ChallengesService} from './challenges.service.js';
import {LocalMessages,type LocalMessagesConfig} from '../../integrations/local-messages.js';
import { Global, Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
@Global()
@Module({})
export class AuthModule {
  static register(secret: string, messages?:LocalMessagesConfig): DynamicModule {
    if (secret.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
    return { module: AuthModule, exports: [AuthService,LocalMessages], controllers: [AuthController,ChallengesController], providers: [
      {provide:LocalMessages,inject:[Pool],useFactory:(pool:Pool)=>new LocalMessages(pool,messages)},
      {provide:ChallengesService,inject:[Pool,AuthService,LocalMessages],useFactory:(pool:Pool,auth:AuthService,m:LocalMessages)=>new ChallengesService(pool,auth,m)},
      { provide: AuthService, inject: [Pool], useFactory: (pool: Pool) => new AuthService(pool, secret) },
    ] };
  }
}
