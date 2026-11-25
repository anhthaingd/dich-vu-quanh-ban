import {textInput} from '../partners/partners.input.js';
import {Body,Controller,Get,Header,Headers,Inject,Param,Post} from '@nestjs/common';
import {body,idempotencyKey,invalid,pathId,rethrow,version} from '../moderation/moderation.input.js';
import {AdminAuthService} from './admin-auth.service.js';
function text(v:unknown,max:number,reason:string,field:string){if(typeof v!=='string'||!v.length||v.length>max)throw invalid(reason,field);return v;}
const password=(v:unknown)=>text(v,128,'ADMIN_PASSWORD_REQUIRED','password');
function input(value:unknown,code=false){const v=body(value,code?['password','code']:['password']);return {password:password(v.password),code:code?text(v.code,6,'ADMIN_MFA_CODE_REQUIRED','code'):''};}
// Same rules as partners deactivationInput, with a reason per field.
function resetInput(value:unknown){const v=body(value,['expected_version','reason']);const expected_version=version(v.expected_version);
 const reason=rethrow('ADMIN_REASON_REQUIRED','reason',()=>textInput(v.reason));if(reason.length>1000)throw invalid('ADMIN_REASON_TOO_LONG','reason');return {expected_version,reason};}
@Controller('admin/auth')
export class AdminAuthController {
 constructor(@Inject(AdminAuthService)private readonly service:AdminAuthService){}
 @Get('status') @Header('Cache-Control','no-store') status(@Headers('authorization')auth:string|undefined){return this.service.status(auth);}
 @Post('enrollment') @Header('Cache-Control','no-store') enroll(@Headers('authorization')auth:string|undefined,@Body()b:unknown){return this.service.enroll(auth,input(b).password);}
 @Post('enrollment/confirm') @Header('Cache-Control','no-store') confirm(@Headers('authorization')auth:string|undefined,@Body()b:unknown){const v=input(b,true);return this.service.verify(auth,v.password,v.code,true);}
 @Post('verify') @Header('Cache-Control','no-store') verify(@Headers('authorization')auth:string|undefined,@Body()b:unknown){const v=input(b,true);return this.service.verify(auth,v.password,v.code);}
 @Post('replacement') @Header('Cache-Control','no-store') replace(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Body()b:unknown){return this.service.enroll(auth,input(b).password,true,token);}
 @Post('backup-codes') @Header('Cache-Control','no-store') backupCodes(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Body()b:unknown){body(b,[]);return this.service.backupCodes(auth,token);}
 @Post('recover') @Header('Cache-Control','no-store') recover(@Headers('authorization')auth:string|undefined,@Body()b:unknown){const v=body(b,['password','code']),code=text(v.code,32,'ADMIN_BACKUP_CODE_FORMAT_INVALID','code');if(!/^[a-f0-9]{32}$/.test(code))throw invalid('ADMIN_BACKUP_CODE_FORMAT_INVALID','code');return this.service.recover(auth,password(v.password),code);}
 @Post('users/:id/reset') @Header('Cache-Control','no-store') reset(@Headers('authorization')auth:string|undefined,@Headers('x-admin-session')token:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.reset(auth,token,pathId(id),resetInput(b),idempotencyKey(key));}
 @Post('lock') @Header('Cache-Control','no-store') lock(@Headers('authorization')auth:string|undefined){return this.service.lock(auth);}
}
