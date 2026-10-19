import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {VerificationService} from './verification.service.js';
import {VerificationController} from './verification.controller.js';
@Module({})
export class VerificationModule {static register(secret:string):DynamicModule{return {module:VerificationModule,controllers:[VerificationController],providers:[{provide:VerificationService,inject:[Pool,AuthService,AdminAuthService],useFactory:(p:Pool,a:AuthService,m:AdminAuthService)=>new VerificationService(p,a,m,new Cursor(secret))}]};}}
