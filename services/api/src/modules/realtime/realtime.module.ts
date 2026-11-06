import {RuntimeLease} from '../../database/runtime-lease.js';
import {Module} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AppLog} from '../../logging/logger.js';
import {RealtimeGateway} from './realtime.gateway.js';
import {RealtimeWorker} from './realtime.worker.js';
@Module({providers:[
 {provide:RealtimeGateway,inject:[Pool,AuthService,RuntimeLease],useFactory:(p:Pool,a:AuthService,l:RuntimeLease)=>new RealtimeGateway(p,a,l)},
 {provide:RealtimeWorker,inject:[Pool,RealtimeGateway,AppLog,RuntimeLease],useFactory:(p:Pool,g:RealtimeGateway,l:AppLog,lease:RuntimeLease)=>new RealtimeWorker(p,g,l,lease)}
],exports:[RealtimeGateway]})
export class RealtimeModule {}
