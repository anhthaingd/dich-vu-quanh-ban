import { Module,type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { Cursor } from '../../common/http/cursor.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';
@Module({})
export class InvoicesModule {static register(secret:string):DynamicModule{return {module:InvoicesModule,controllers:[InvoicesController],providers:[{provide:InvoicesService,inject:[Pool,AuthService],useFactory:(pool:Pool,auth:AuthService)=>new InvoicesService(pool,auth,new Cursor(secret))}]};}}
