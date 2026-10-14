import { Body, Controller, Header, Headers, HttpCode, Inject, Ip, Post } from '@nestjs/common';
import { ChallengesService } from './challenges.service.js';
import { challengeInput, passwordInput, verifyInput } from './challenge.input.js';
@Controller('auth')
export class ChallengesController {
 constructor(@Inject(ChallengesService) private readonly service:ChallengesService){}
 @Post('challenges') @Header('Cache-Control','no-store')
 request(@Headers('authorization') auth:string|undefined,@Body() body:unknown,@Ip() ip:string){return this.service.request(auth,challengeInput(body),ip);}
 @Post('challenges/verify') @HttpCode(200) @Header('Cache-Control','no-store')
 verify(@Headers('authorization') auth:string|undefined,@Body() body:unknown){return this.service.verify(auth,verifyInput(body));}
 @Post('reauthenticate') @HttpCode(200) @Header('Cache-Control','no-store')
 reauth(@Headers('authorization') auth:string|undefined,@Body() body:unknown,@Ip() ip:string){return this.service.reauthenticate(auth,passwordInput(body),ip);}
}
