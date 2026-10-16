import { Body, Controller, Get, Header, Headers, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { identifier, pageInput } from '../accounts/accounts.input.js';
import { replyInput, reviewInput, visibilityInput } from './reviews.input.js';
import { ReviewsService } from './reviews.service.js';
@Controller()
export class ReviewsController {
 constructor(@Inject(ReviewsService) private readonly service: ReviewsService) {}
 @Get('partners/:id/reviews') @Header('Cache-Control','no-store')
 publicList(@Param('id') id:string,@Query() q:Record<string,unknown>) { return this.service.list(undefined,identifier(id),true,pageInput(q)); }
 @Get('jobs/:id/reviews') @Header('Cache-Control','no-store')
 list(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query() q:Record<string,unknown>) { return this.service.list(auth,identifier(id),false,pageInput(q)); }
 @Post('jobs/:id/reviews') @Header('Cache-Control','no-store')
 create(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.create(auth,identifier(id),reviewInput(body),identifier(key)); }
 @Patch('reviews/:id') @Header('Cache-Control','no-store')
 edit(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.edit(auth,identifier(id),reviewInput(body,true),identifier(key)); }
 @Put('reviews/:id/reply') @Header('Cache-Control','no-store')
 reply(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.reply(auth,identifier(id),replyInput(body),identifier(key)); }
 @Post('reviews/:id/visibility') @Header('Cache-Control','no-store')
 visibility(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.visibility(auth,identifier(id),visibilityInput(body),identifier(key)); }
}
