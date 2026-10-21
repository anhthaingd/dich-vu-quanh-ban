import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
import {BadRequestException} from '@nestjs/common';
import {CallsService} from './calls.service.js';
import {callChange,callCreate,callsQuery} from './calls.input.js';
@Controller()
export class CallsController {
 constructor(@Inject(CallsService) private readonly service:CallsService){}
 @Get('jobs/:id/call-targets') @Header('Cache-Control','no-store') targets(@Headers('authorization') h:string|undefined,@Param('id') id:string){return this.service.targets(h,identifier(id));}
 @Post('calls') @Header('Cache-Control','no-store') create(@Headers('authorization') h:string|undefined,@Headers('idempotency-key') k:string,@Body() b:unknown){return this.service.create(h,callCreate(b),identifier(k));}
 @Get('calls') @Header('Cache-Control','no-store') list(@Headers('authorization') h:string|undefined,@Query() q:Record<string,unknown>){return this.service.list(h,callsQuery(q));}
 @Get('calls/:id') @Header('Cache-Control','no-store') get(@Headers('authorization') h:string|undefined,@Param('id') id:string){return this.service.get(h,identifier(id));}
 @Post('calls/:id/actions') @Header('Cache-Control','no-store') action(@Headers('authorization') h:string|undefined,@Headers('idempotency-key') k:string,@Param('id') id:string,@Body() b:unknown){const v=object(b,['expected_version','action']);if(!['accept','decline','end','fail'].includes(String(v.action)))throw new BadRequestException();return this.service.change(h,identifier(id),v.action as 'accept'|'decline'|'end'|'fail',callChange({expected_version:v.expected_version}),identifier(k));}
 @Post('calls/:id/media') @Header('Cache-Control','no-store') media(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Body() b:unknown){if(b!==undefined)object(b,[]);return this.service.mediaToken(h,identifier(id));}
 @Post('calls/:id/heartbeat') @Header('Cache-Control','no-store') heartbeat(@Headers('authorization') h:string|undefined,@Param('id') id:string,@Body() b:unknown){if(b!==undefined)object(b,[]);return this.service.heartbeat(h,identifier(id));}
}
