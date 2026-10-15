import {Module} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AppLog} from '../../logging/logger.js';
import {RealtimeGateway} from './realtime.gateway.js';
import {RealtimeWorker} from './realtime.worker.js';
@Module({providers:[
 {provide:RealtimeGateway,inject:[Pool,AuthService],useFactory:(p:Pool,a:AuthService)=>new RealtimeGateway(p,a)},
 {provide:RealtimeWorker,inject:[Pool,RealtimeGateway,AppLog],useFactory:(p:Pool,g:RealtimeGateway,l:AppLog)=>new RealtimeWorker(p,g,l)}
],exports:[RealtimeGateway]})
export class RealtimeModule {}
