import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {FinanceService,type FinanceConfig} from './finance.service.js';
import {FinanceController} from './finance.controller.js';
@Module({})
export class FinanceModule {static register(secret:string,config?:FinanceConfig):DynamicModule{return {module:FinanceModule,controllers:[FinanceController],providers:[{provide:FinanceService,inject:[Pool,AuthService,AdminAuthService],useFactory:(pool:Pool,auth:AuthService,admin:AdminAuthService)=>new FinanceService(pool,auth,admin,new Cursor(secret),config)}]};}}
