import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {BackofficeService} from './backoffice.service.js';
import {BackofficeController} from './backoffice.controller.js';
@Module({})
export class BackofficeModule {static register(secret:string):DynamicModule{return {module:BackofficeModule,controllers:[BackofficeController],providers:[{provide:BackofficeService,inject:[Pool,AuthService,AdminAuthService],useFactory:(p:Pool,a:AuthService,m:AdminAuthService)=>new BackofficeService(p,a,m,new Cursor(secret))}]};}}
