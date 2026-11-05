import {AdminInvitationsService} from './admin-invitations.service.js';
import {AdminInvitationsController} from './admin-invitations.controller.js';
import {LocalMessages} from '../../integrations/local-messages.js';
import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {BackofficeService} from './backoffice.service.js';
import {BackofficeController} from './backoffice.controller.js';
@Module({})
export class BackofficeModule {static register(secret:string):DynamicModule{return {module:BackofficeModule,controllers:[BackofficeController,AdminInvitationsController],providers:[{provide:AdminInvitationsService,inject:[Pool,AuthService,AdminAuthService,LocalMessages],useFactory:(p:Pool,a:AuthService,m:AdminAuthService,l:LocalMessages)=>new AdminInvitationsService(p,a,m,l,new Cursor(secret))},{provide:BackofficeService,inject:[Pool,AuthService,AdminAuthService],useFactory:(p:Pool,a:AuthService,m:AdminAuthService)=>new BackofficeService(p,a,m,new Cursor(secret))}]};}}
