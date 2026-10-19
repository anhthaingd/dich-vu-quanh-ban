import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {SupportService} from '../support/support.service.js';
import {SupportModule} from '../support/support.module.js';
import {Cursor} from '../../common/http/cursor.js';
import {ModerationService} from './moderation.service.js';
import {ModerationController} from './moderation.controller.js';
@Module({})
export class ModerationModule {static register(secret:string):DynamicModule{return {module:ModerationModule,imports:[SupportModule.register(secret)],controllers:[ModerationController],exports:[ModerationService],providers:[{provide:ModerationService,inject:[Pool,AuthService,AdminAuthService,SupportService],useFactory:(p:Pool,a:AuthService,m:AdminAuthService,s:SupportService)=>new ModerationService(p,a,m,new Cursor(secret),s)}]};}}
