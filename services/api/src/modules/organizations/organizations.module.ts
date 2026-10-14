import {Module,type DynamicModule} from '@nestjs/common';
import {Pool} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {LocalMessages} from '../../integrations/local-messages.js';
import {Cursor} from '../../common/http/cursor.js';
import {OrganizationsService} from './organizations.service.js';
import {OrganizationsController} from './organizations.controller.js';
@Module({})
export class OrganizationsModule {
 static register(secret:string):DynamicModule {return {module:OrganizationsModule,controllers:[OrganizationsController],providers:[{provide:OrganizationsService,inject:[Pool,AuthService,LocalMessages],useFactory:(pool:Pool,auth:AuthService,m:LocalMessages)=>new OrganizationsService(pool,auth,new Cursor(secret),m)}]};}
}
