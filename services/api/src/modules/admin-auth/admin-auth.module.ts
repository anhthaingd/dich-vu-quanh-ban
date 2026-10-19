import {Global,Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService,type AdminConfig} from './admin-auth.service.js';
import {AdminAuthController} from './admin-auth.controller.js';
@Global() @Module({})
export class AdminAuthModule {static register(config?:AdminConfig):DynamicModule{return {module:AdminAuthModule,exports:[AdminAuthService],controllers:[AdminAuthController],providers:[{provide:AdminAuthService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new AdminAuthService(pool,auth,config)}]};}}
