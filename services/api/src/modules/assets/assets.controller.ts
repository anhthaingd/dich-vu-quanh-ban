import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Put,Query,Req,StreamableFile} from '@nestjs/common';
import type {IncomingMessage} from 'node:http';
import {identifier} from '../accounts/accounts.input.js';
import {AssetsService} from './assets.service.js';
@Controller('assets')
export class AssetsController {
 constructor(@Inject(AssetsService)private readonly service:AssetsService){}
 @Post('upload-grants') @Header('Cache-Control','no-store')
 grant(@Headers('authorization')auth:string|undefined,@Headers('idempotency-key')key:string|undefined,@Body()body:unknown){return this.service.grant(auth,body,identifier(key));}
 @Put(':id/upload') @Header('Cache-Control','no-store')
 upload(@Param('id')id:string,@Query('grant')grant:unknown,@Req()req:IncomingMessage){return this.service.upload(identifier(id),grant,req);}
 @Post(':id/complete') @Header('Cache-Control','no-store')
 complete(@Headers('authorization')auth:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.complete(auth,identifier(id),identifier(key),body);}
 @Get(':id/content') @Header('Cache-Control','no-store') @Header('X-Content-Type-Options','nosniff')
 async content(@Param('id')id:string,@Query('grant')grant:unknown){return new StreamableFile(await this.service.content(identifier(id),grant),{type:'image/png'});}
 @Get(':id') @Header('Cache-Control','no-store')
 get(@Headers('authorization')auth:string|undefined,@Param('id')id:string){return this.service.get(auth,identifier(id));}
}
