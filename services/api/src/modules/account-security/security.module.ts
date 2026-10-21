import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {LocalMessages} from '../../integrations/local-messages.js';
import {Cursor} from '../../common/http/cursor.js';
import {SecurityService} from './security.service.js';
import {SecurityController} from './security.controller.js';
@Module({})
export class AccountSecurityModule{static register(secret:string):DynamicModule{return {module:AccountSecurityModule,controllers:[SecurityController],providers:[{provide:SecurityService,inject:[Pool,AuthService,LocalMessages,AdminAuthService],useFactory:(pool:Pool,auth:AuthService,messages:LocalMessages,admin:AdminAuthService)=>new SecurityService(pool,auth,messages,admin,new Cursor(secret))}]};}}
