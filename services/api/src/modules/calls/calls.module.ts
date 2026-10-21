import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {LiveKitMedia,type CallsConfig} from '../../integrations/livekit/livekit.adapter.js';
import {CallsService} from './calls.service.js';
import {CallsController} from './calls.controller.js';
@Module({})
export class CallsModule {
 static register(secret:string,config?:CallsConfig):DynamicModule{return {module:CallsModule,controllers:[CallsController],providers:[{provide:CallsService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new CallsService(pool,auth,config?new LiveKitMedia(config):undefined,new Cursor(secret))}]};}
}
