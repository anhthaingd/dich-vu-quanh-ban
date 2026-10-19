import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AssetsService,type LocalAssets} from './assets.service.js';
import {AssetsController} from './assets.controller.js';
@Module({})
export class AssetsModule {static register(secret:string,config?:LocalAssets):DynamicModule{return {module:AssetsModule,controllers:[AssetsController],providers:[{provide:AssetsService,inject:[Pool,AuthService,AdminAuthService],useFactory:(pool:Pool,auth:AuthService,admin:AdminAuthService)=>new AssetsService(pool,auth,secret,config,admin)}]};}}
