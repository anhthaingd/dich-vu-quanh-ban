import { cloudTransport, resendTransport } from '../../integrations/cloud.js';
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
  static register(secret: string, messages?:LocalMessagesConfig,pilotEmails?:string[],sesFrom?:string,pilotPhones:string[]=[],smsEnabled=false, verificationPolicy:'phone'|'email_lab'='phone', resend?:{from:string;apiKey:string}): DynamicModule {
    if (secret.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
    return { module: AuthModule, exports: [AuthService,LocalMessages], controllers: [AuthController,ChallengesController], providers: [
      {provide:LocalMessages,inject:[Pool],useFactory:(pool:Pool)=>new LocalMessages(pool,messages,resend?cloudTransport(resend.from,pilotPhones,smsEnabled,resendTransport(resend.from,resend.apiKey)):sesFrom?cloudTransport(sesFrom,pilotPhones,smsEnabled):undefined)},
      {provide:ChallengesService,inject:[Pool,AuthService,LocalMessages],useFactory:(pool:Pool,auth:AuthService,m:LocalMessages)=>new ChallengesService(pool,auth,m)},
      { provide: AuthService, inject: [Pool], useFactory: (pool: Pool) => new AuthService(pool, secret,pilotEmails,verificationPolicy) },
    ] };
  }
}
