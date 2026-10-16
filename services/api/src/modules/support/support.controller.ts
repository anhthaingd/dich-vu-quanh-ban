import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {identifier,pageInput} from '../accounts/accounts.input.js';
import {reportInput,reportReply} from './support.input.js';
import {SupportService} from './support.service.js';
@Controller('reports')
export class SupportController {
 constructor(@Inject(SupportService) private readonly service:SupportService){}
 @Get() @Header('Cache-Control','no-store')
 list(@Headers('authorization') auth:string|undefined,@Query() q:Record<string,unknown>){return this.service.list(auth,pageInput(q));}
 @Get(':id') @Header('Cache-Control','no-store')
 get(@Headers('authorization') auth:string|undefined,@Param('id') id:string){return this.service.get(auth,identifier(id));}
 @Post() @Header('Cache-Control','no-store')
 create(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Body() body:unknown){return this.service.create(auth,reportInput(body),identifier(key));}
 @Post(':id/updates') @Header('Cache-Control','no-store')
 reply(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown){return this.service.reply(auth,identifier(id),reportReply(body),identifier(key));}
}
