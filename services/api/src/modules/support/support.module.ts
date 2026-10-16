import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {SupportService} from './support.service.js';
import {SupportController} from './support.controller.js';
@Module({})
export class SupportModule {
 static register(secret:string):DynamicModule{return {module:SupportModule,controllers:[SupportController],providers:[{provide:SupportService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new SupportService(pool,auth,new Cursor(secret))}]};}
}
