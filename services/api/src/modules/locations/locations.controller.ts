import { Body, Controller, Header, Headers, HttpCode, HttpException, Inject, Optional, Param, Post, Req, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthService } from '../auth/auth.service.js';
import { GeoapifyProvider } from '../../integrations/maps/geoapify.js';
import { locationInput, type LocationAction } from './locations.input.js';
import { LocationLimit } from './locations.limit.js';
@Controller('locations')
export class LocationsController {
  constructor(@Inject(GeoapifyProvider) private readonly provider:GeoapifyProvider,@Inject(LocationLimit) private readonly limit:LocationLimit,@Optional() @Inject(AuthService) private readonly auth?:AuthService) {}
  @Post(':action') @HttpCode(200) @Header('Cache-Control','no-store')
  async lookup(@Param('action') action:string,@Body() body:unknown,@Headers('authorization') header:string|undefined,@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse) {
    if(!['autocomplete','geocode','reverse'].includes(action))throw new BadRequestException();
    const input=locationInput(action as LocationAction,body);
    // Do not trust arbitrary client IP headers or client-supplied account IDs.
    if (header && !this.auth) throw new UnauthorizedException();
    const user=header&&this.auth?(await this.auth.authenticate(header)).user.id:null;
    const retry=this.limit.take(user?`user:${user}`:`ip:${req.socket.remoteAddress??'unknown'}`);
    if(retry){res.setHeader('Retry-After',retry);throw new HttpException('Rate limited',429);}
    try {return await this.provider.lookup(action as LocationAction,input);}
    catch(e){if(e instanceof HttpException&&e.getStatus()===429)res.setHeader('Retry-After',60);throw e;}
  }
}
