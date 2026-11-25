import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Put,Query} from '@nestjs/common';
import {idempotencyKey,pathId} from './moderation.input.js';
import {queueInput} from './moderation.input.js';
import {operationInput} from './operations.input.js';
import {OperationsService} from './operations.service.js';
@Controller('admin')
export class OperationsController {
 constructor(@Inject(OperationsService)private service:OperationsService){}
 @Get('users') @Header('Cache-Control','no-store') list_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'users',queueInput(q));}
 @Get('users/:id') @Header('Cache-Control','no-store') get_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'users',pathId(id));}
 @Post('users/:id/decision') @Header('Cache-Control','no-store') save_users(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'users',pathId(id),operationInput(b,'users',false),idempotencyKey(k));}
 @Get('partners') @Header('Cache-Control','no-store') list_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'partners',queueInput(q));}
 @Get('partners/:id') @Header('Cache-Control','no-store') get_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'partners',pathId(id));}
 @Post('partners/:id/decision') @Header('Cache-Control','no-store') save_partners(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'partners',pathId(id),operationInput(b,'partners',false),idempotencyKey(k));}
 @Get('categories') @Header('Cache-Control','no-store') list_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'categories',queueInput(q));}
 @Get('categories/:id') @Header('Cache-Control','no-store') get_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'categories',pathId(id));}
 @Put('categories/:id') @Header('Cache-Control','no-store') save_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'categories',pathId(id),operationInput(b,'categories',false),idempotencyKey(k));}
 @Post('categories') @Header('Cache-Control','no-store') create_categories(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.save(a,t,'categories',null,operationInput(b,'categories',true),idempotencyKey(k));}
 @Get('skills') @Header('Cache-Control','no-store') list_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'skills',queueInput(q));}
 @Get('skills/:id') @Header('Cache-Control','no-store') get_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'skills',pathId(id));}
 @Put('skills/:id') @Header('Cache-Control','no-store') save_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown,@Param('id')id:string){return this.service.save(a,t,'skills',pathId(id),operationInput(b,'skills',false),idempotencyKey(k));}
 @Post('skills') @Header('Cache-Control','no-store') create_skills(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.save(a,t,'skills',null,operationInput(b,'skills',true),idempotencyKey(k));}
}
