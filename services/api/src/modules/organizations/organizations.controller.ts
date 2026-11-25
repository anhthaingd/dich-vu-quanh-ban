import {Body,Controller,Get,Header,Headers,HttpCode,Inject,Param,Post,Put,Query} from '@nestjs/common';
import {OrganizationsService} from './organizations.service.js';
import {pageInput} from '../accounts/accounts.input.js';
import {pathId,requestKey} from '../finance/finance.input.js';
import {inviteInput,tokenInput,changeInput,grantsInput,contactEdit,organizationQuery} from './organizations.input.js';
@Controller()
export class OrganizationsController {
 constructor(@Inject(OrganizationsService) private readonly service:OrganizationsService){}
 @Post('partners/:id/invitations') @Header('Cache-Control','no-store')
 invite(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.invite(auth,pathId(id),inviteInput(body),requestKey(key));}
 @Get('partners/:id/invitations') @Header('Cache-Control','no-store')
 invitations(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.invitations(auth,pathId(id),organizationQuery(q,'status'));}
 @Post('invitations/:id/resend') @HttpCode(200) @Header('Cache-Control','no-store')
 resend(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.invitationChange(auth,pathId(id),'resend',changeInput(body,false),requestKey(key));}
 @Post('invitations/:id/revoke') @HttpCode(200) @Header('Cache-Control','no-store')
 revoke(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.invitationChange(auth,pathId(id),'revoke',changeInput(body),requestKey(key));}
 @Post('invitations/accept') @HttpCode(200) @Header('Cache-Control','no-store')
 accept(@Headers('authorization') auth:string|undefined,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.accept(auth,tokenInput(body),requestKey(key));}
 @Get('me/memberships') @Header('Cache-Control','no-store')
 mine(@Headers('authorization') auth:string|undefined,@Query() q:Record<string,unknown>){return this.service.mine(auth,organizationQuery(q,'active'));}
 @Put('memberships/:id/grants') @Header('Cache-Control','no-store')
 grants(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.grants(auth,pathId(id),grantsInput(body),requestKey(key));}
 @Get('memberships/:id/departure-preview') @Header('Cache-Control','no-store')
 preview(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.preview(auth,pathId(id),pageInput(q));}
 @Post('memberships/:id/deactivate') @Header('Cache-Control','no-store')
 deactivate(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.departure(auth,pathId(id),'deactivate',changeInput(body),requestKey(key));}
 @Post('memberships/:id/leave') @Header('Cache-Control','no-store')
 leave(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.departure(auth,pathId(id),'leave',changeInput(body),requestKey(key));}
 @Get('partners/:id/call-contact') @Header('Cache-Control','no-store')
 contact(@Headers('authorization') auth:string|undefined,@Param('id') id:string){return this.service.callContact(auth,pathId(id));}
 @Put('partners/:id/call-contact') @Header('Cache-Control','no-store')
 setContact(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() body:unknown,@Headers('idempotency-key') key:string){return this.service.setContact(auth,pathId(id),contactEdit(body),requestKey(key));}
}
