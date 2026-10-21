import {BadRequestException,Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
import {queueInput} from '../moderation/moderation.input.js';
import {grantsInput,metricsInput} from './backoffice.input.js';
import {BackofficeService} from './backoffice.service.js';
@Controller()
export class BackofficeController {
 constructor(@Inject(BackofficeService)private service:BackofficeService){}
 @Get('admin/metrics') @Header('Cache-Control','no-store') metrics(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.metrics(a,t,metricsInput(q));}
 @Get('admin/grant-users') @Header('Cache-Control','no-store') users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'grant-users',queueInput(q));}
 @Get('admin/users/:id/grants') @Header('Cache-Control','no-store') grants(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.grants(a,t,identifier(id));}
 @Post('admin/users/:id/grants') @Header('Cache-Control','no-store') save(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string,@Headers('idempotency-key')k:string|undefined,@Body()body:unknown){return this.service.saveGrants(a,t,identifier(id),grantsInput(body),identifier(k));}
 @Get('admin/jobs') @Header('Cache-Control','no-store') jobs(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'jobs',queueInput(q));}
 @Get('admin/jobs/:id') @Header('Cache-Control','no-store') job(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'jobs',identifier(id));}
 @Get('admin/invoices') @Header('Cache-Control','no-store') invoices(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'invoices',queueInput(q));}
 @Get('admin/invoices/:id') @Header('Cache-Control','no-store') invoice(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'invoices',identifier(id));}
 @Get('operations/:key') @Header('Cache-Control','no-store') operation(@Headers('authorization')a:string|undefined,@Param('key')k:string,@Query()q:Record<string,unknown>){object(q,['operation']);if(q.operation!==undefined&&(typeof q.operation!=='string'||!q.operation||q.operation.length>200))throw new BadRequestException();return this.service.operation(a,identifier(k),q.operation as string|undefined);}
}
