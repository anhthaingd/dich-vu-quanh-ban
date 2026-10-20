import {Body,Controller,Get,Header,Headers,Inject,Param,Post} from '@nestjs/common';
import {identifier} from '../accounts/accounts.input.js';
import {CompletionService} from './completion.service.js';
import {completionInput} from './completion.input.js';
@Controller('admin/reports')
export class CompletionController {
 constructor(@Inject(CompletionService)private readonly service:CompletionService){}
 @Get(':id/completion-preview') @Header('Cache-Control','no-store') preview(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.preview(a,t,identifier(id));}
 @Post(':id/complete-on-behalf') @Header('Cache-Control','no-store') complete(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.complete(a,t,identifier(id),completionInput(body),identifier(key));}
}
