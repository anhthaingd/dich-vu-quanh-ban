import {Body,Controller,Get,Header,Headers,HttpCode,Inject,Param,Post,Put,Query} from '@nestjs/common';
import {identifier,pageInput,emptyBody} from '../accounts/accounts.input.js';
import {NotificationsService,settingsInput,deviceInput} from './notifications.service.js';
@Controller('me')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service:NotificationsService){}
  @Post('devices') @Header('Cache-Control','no-store') device(@Headers('authorization')auth:string|undefined,@Headers('idempotency-key')key:string|undefined,@Body()body:unknown){return this.service.registerDevice(auth,deviceInput(body),identifier(key));}
  @Get('notifications') @Header('Cache-Control','no-store')
  list(@Headers('authorization') auth:string|undefined,@Query() q:Record<string,unknown>){return this.service.list(auth,pageInput(q));}
  @Post('notifications/:id/read') @HttpCode(200) @Header('Cache-Control','no-store')
  read(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown){emptyBody(body);return this.service.read(auth,identifier(id),identifier(key));}
  @Get('notification-settings') @Header('Cache-Control','no-store')
  settings(@Headers('authorization') auth:string|undefined){return this.service.settings(auth);}
  @Put('notification-settings') @Header('Cache-Control','no-store')
  save(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Body() body:unknown){return this.service.setSettings(auth,settingsInput(body),identifier(key));}
}
