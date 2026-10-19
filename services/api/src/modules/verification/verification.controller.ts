import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {identifier,pageInput} from '../accounts/accounts.input.js';
import {VerificationService,verificationInput} from './verification.service.js';
@Controller('partners')
export class VerificationController {
 constructor(@Inject(VerificationService)private readonly service:VerificationService){}
 @Get(':id/verification') @Header('Cache-Control','no-store') list(@Headers('authorization')a:string|undefined,@Param('id')id:string,@Query()q:Record<string,unknown>){return this.service.list(a,identifier(id),pageInput(q));}
 @Post(':id/verification') @Header('Cache-Control','no-store') submit(@Headers('authorization')a:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.submit(a,identifier(id),verificationInput(body),identifier(k));}
}
