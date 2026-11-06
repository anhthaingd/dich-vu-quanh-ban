import {RuntimeLease} from '../../database/runtime-lease.js';
import {PushWorker,type PushConfig} from './push.worker.js';
import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {AppLog} from '../../logging/logger.js';
import {NotificationsService} from './notifications.service.js';
import {NotificationsWorker} from './notifications.worker.js';
import {NotificationsController} from './notifications.controller.js';
@Module({})
export class NotificationsModule {
 static register(secret:string,push?:PushConfig):DynamicModule{return {module:NotificationsModule,controllers:[NotificationsController],providers:[
  {provide:PushWorker,inject:[Pool,AppLog,RuntimeLease],useFactory:(pool:Pool,log:AppLog,lease:RuntimeLease)=>new PushWorker(pool,log,push,undefined,lease)},
  {provide:NotificationsService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new NotificationsService(pool,auth,new Cursor(secret))},
  {provide:NotificationsWorker,inject:[Pool,AppLog],useFactory:(pool:Pool,log:AppLog)=>new NotificationsWorker(pool,log)}]};}
}
