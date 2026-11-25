import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {idempotencyKey,page,pathId} from './moderation.input.js';
import {ModerationService} from './moderation.service.js';
import {decisionInput,queueInput,reportQueueInput,noteInput} from './moderation.input.js';
@Controller('admin')
export class ModerationController {
 constructor(@Inject(ModerationService)private readonly service:ModerationService){}
 @Get('moderation-audit') @Header('Cache-Control','no-store') audit(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.audit(a,t,page(q));}
 @Get('reports') @Header('Cache-Control','no-store') list_reports(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'reports',reportQueueInput(q));}
 @Get('reports-summary') @Header('Cache-Control','no-store') summary(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.reportSummary(a,t,reportQueueInput(q));}
 @Get('reports/:id') @Header('Cache-Control','no-store') get_reports(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'reports',pathId(id));}
 @Post('reports/:id/decision') @Header('Cache-Control','no-store') decide_reports(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.decide(a,t,'reports',pathId(id),decisionInput(body,'reports'),idempotencyKey(key));}
 @Post('reports/:id/notes') @Header('Cache-Control','no-store') note(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.note(a,t,pathId(id),noteInput(body),idempotencyKey(key));}
 @Get('verifications') @Header('Cache-Control','no-store') list_verifications(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'verifications',queueInput(q));}
 @Get('verifications/:id') @Header('Cache-Control','no-store') get_verifications(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'verifications',pathId(id));}
 @Post('verifications/:id/decision') @Header('Cache-Control','no-store') decide_verifications(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.decide(a,t,'verifications',pathId(id),decisionInput(body,'verifications'),idempotencyKey(key));}
 @Get('reviews') @Header('Cache-Control','no-store') list_reviews(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,'reviews',queueInput(q));}
 @Get('reviews/:id') @Header('Cache-Control','no-store') get_reviews(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.get(a,t,'reviews',pathId(id));}
 @Post('reviews/:id/decision') @Header('Cache-Control','no-store') decide_reviews(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.decide(a,t,'reviews',pathId(id),decisionInput(body,'reviews'),idempotencyKey(key));}
}
