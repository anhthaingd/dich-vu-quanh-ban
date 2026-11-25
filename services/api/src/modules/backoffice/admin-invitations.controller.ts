import {Body,Controller,Get,Header,Headers,Inject,Param,Post,Query} from '@nestjs/common';
import {idempotencyKey,page,pathId} from '../moderation/moderation.input.js';
import {adminInvitationInput,invitationChangeInput,invitationTokenInput} from './admin-invitations.input.js';
import {AdminInvitationsService} from './admin-invitations.service.js';
@Controller()
export class AdminInvitationsController {
 constructor(@Inject(AdminInvitationsService)private service:AdminInvitationsService){}
 @Get('admin/invitations') @Header('Cache-Control','no-store') list(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(a,t,page(q));}
 @Post('admin/invitations') @Header('Cache-Control','no-store') invite(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.invite(a,t,adminInvitationInput(b),idempotencyKey(k));}
 @Post('admin/invitations/:id/resend') @Header('Cache-Control','no-store') resend(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.change(a,t,pathId(id),'resend',invitationChangeInput(b),idempotencyKey(k));}
 @Post('admin/invitations/:id/revoke') @Header('Cache-Control','no-store') revoke(@Headers('authorization')a:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.change(a,t,pathId(id),'revoke',invitationChangeInput(b),idempotencyKey(k));}
 @Post('admin-invitations/preview') @Header('Cache-Control','no-store') preview(@Headers('authorization')a:string|undefined,@Body()b:unknown){return this.service.preview(a,invitationTokenInput(b));}
 @Post('admin-invitations/accept') @Header('Cache-Control','no-store') accept(@Headers('authorization')a:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.accept(a,invitationTokenInput(b),idempotencyKey(k));}
}
