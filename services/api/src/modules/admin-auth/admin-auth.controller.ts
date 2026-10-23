import {deactivationInput} from '../partners/partners.input.js';
import {BadRequestException,Body,Controller,Get,Header,Headers,Inject,Param,Post} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
import {AdminAuthService} from './admin-auth.service.js';
function text(v:unknown,max:number){if(typeof v!=='string'||!v.length||v.length>max)throw new BadRequestException();return v;}
function input(body:unknown,code=false){const v=object(body,code?['password','code']:['password']);return {password:text(v.password,128),code:code?text(v.code,6):''};}
@Controller('admin/auth')
export class AdminAuthController {
 constructor(@Inject(AdminAuthService)private readonly service:AdminAuthService){}
 @Get('status') @Header('Cache-Control','no-store') status(@Headers('authorization')auth:string|undefined){return this.service.status(auth);}
 @Post('enrollment') @Header('Cache-Control','no-store') enroll(@Headers('authorization')auth:string|undefined,@Body()body:unknown){return this.service.enroll(auth,input(body).password);}
 @Post('enrollment/confirm') @Header('Cache-Control','no-store') confirm(@Headers('authorization')auth:string|undefined,@Body()body:unknown){const v=input(body,true);return this.service.verify(auth,v.password,v.code,true);}
 @Post('verify') @Header('Cache-Control','no-store') verify(@Headers('authorization')auth:string|undefined,@Body()body:unknown){const v=input(body,true);return this.service.verify(auth,v.password,v.code);}
 @Post('replacement') @Header('Cache-Control','no-store') replace(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Body()body:unknown){return this.service.enroll(auth,input(body).password,true,token);}
 @Post('backup-codes') @Header('Cache-Control','no-store') backupCodes(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Body()body:unknown){object(body,[]);return this.service.backupCodes(auth,token);}
 @Post('recover') @Header('Cache-Control','no-store') recover(@Headers('authorization')auth:string|undefined,@Body()body:unknown){const v=object(body,['password','code']),code=text(v.code,32);if(!/^[a-f0-9]{32}$/.test(code))throw new BadRequestException();return this.service.recover(auth,text(v.password,128),code);}
 @Post('users/:id/reset') @Header('Cache-Control','no-store') reset(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.reset(auth,token,identifier(id),deactivationInput(body),identifier(key));}
 @Post('lock') @Header('Cache-Control','no-store') lock(@Headers('authorization')auth:string|undefined){return this.service.lock(auth);}
}
