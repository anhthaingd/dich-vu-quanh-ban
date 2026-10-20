import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Put,Query} from '@nestjs/common';
import {identifier} from '../accounts/accounts.input.js';
import {queueInput} from './moderation.input.js';
import {operationInput} from './operations.input.js';
import {OperationsService} from './operations.service.js';
@Controller('admin')
export class OperationsController {
 constructor(@Inject(OperationsService)private service:OperationsService){}
 @Get('users') @Header('Cache-Control','no-store') list_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'users',queueInput(q));}
 @Get('users/:id') @Header('Cache-Control','no-store') get_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'users',identifier(id));}
 @Post('users/:id/decision') @Header('Cache-Control','no-store') save_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'users',identifier(id),operationInput(b,'users',false),identifier(k));}
 @Get('partners') @Header('Cache-Control','no-store') list_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'partners',queueInput(q));}
 @Get('partners/:id') @Header('Cache-Control','no-store') get_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'partners',identifier(id));}
 @Post('partners/:id/decision') @Header('Cache-Control','no-store') save_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'partners',identifier(id),operationInput(b,'partners',false),identifier(k));}
 @Get('categories') @Header('Cache-Control','no-store') list_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'categories',queueInput(q));}
 @Get('categories/:id') @Header('Cache-Control','no-store') get_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'categories',identifier(id));}
 @Put('categories/:id') @Header('Cache-Control','no-store') save_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'categories',identifier(id),operationInput(b,'categories',false),identifier(k));}
 @Post('categories') @Header('Cache-Control','no-store') create_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.save(a,t,'categories',null,operationInput(b,'categories',true),identifier(k));}
 @Get('skills') @Header('Cache-Control','no-store') list_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'skills',queueInput(q));}
 @Get('skills/:id') @Header('Cache-Control','no-store') get_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'skills',identifier(id));}
 @Put('skills/:id') @Header('Cache-Control','no-store') save_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'skills',identifier(id),operationInput(b,'skills',false),identifier(k));}
 @Post('skills') @Header('Cache-Control','no-store') create_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.save(a,t,'skills',null,operationInput(b,'skills',true),identifier(k));}
}
