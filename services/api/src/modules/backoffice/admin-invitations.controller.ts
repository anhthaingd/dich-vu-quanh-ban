import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {identifier,pageInput} from '../accounts/accounts.input.js';
import {changeInput,tokenInput} from '../organizations/organizations.input.js';
import {adminInvitationInput} from './admin-invitations.input.js';
import {AdminInvitationsService} from './admin-invitations.service.js';
@Controller()
export class AdminInvitationsController {
 constructor(@Inject(AdminInvitationsService)private service:AdminInvitationsService){}
 @Get('admin/invitations') @Header('Cache-Control','no-store') list(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,pageInput(q));}
 @Post('admin/invitations') @Header('Cache-Control','no-store') invite(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.invite(a,t,adminInvitationInput(b),identifier(k));}
 @Post('admin/invitations/:id/resend') @Header('Cache-Control','no-store') resend(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.change(a,t,identifier(id),'resend',changeInput(b),identifier(k));}
 @Post('admin/invitations/:id/revoke') @Header('Cache-Control','no-store') revoke(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.change(a,t,identifier(id),'revoke',changeInput(b),identifier(k));}
 @Post('admin-invitations/preview') @Header('Cache-Control','no-store') preview(@Headers('authorization')a:string|undefined,@Body()b:unknown){return this.service.preview(a,tokenInput(b));}
 @Post('admin-invitations/accept') @Header('Cache-Control','no-store') accept(@Headers('authorization')a:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.accept(a,tokenInput(b),identifier(k));}
}
