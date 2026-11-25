import { Body, Controller, Get, Header, Headers, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { pageInput } from '../accounts/accounts.input.js';
import { idempotencyKey, pathId } from '../jobs/jobs.input.js';
import { replyInput, reviewInput, visibilityInput } from './reviews.input.js';
import { ReviewsService } from './reviews.service.js';
@Controller()
export class ReviewsController {
 constructor(@Inject(ReviewsService) private readonly service: ReviewsService) {}
 @Get('partners/:id/reviews') @Header('Cache-Control','no-store')
 publicList(@Param('id') id:string,@Query() q:Record<string,unknown>) { return this.service.list(undefined,pathId(id),true,pageInput(q)); }
 @Get('jobs/:id/customer-reviews') @Header('Cache-Control','no-store')
 customerHistory(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query() q:Record<string,unknown>){return this.service.customerHistory(auth,pathId(id),pageInput(q));}
 @Get('jobs/:id/reviews') @Header('Cache-Control','no-store')
 list(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query() q:Record<string,unknown>) { return this.service.list(auth,pathId(id),false,pageInput(q)); }
 @Post('jobs/:id/reviews') @Header('Cache-Control','no-store')
 create(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.create(auth,pathId(id),reviewInput(body),idempotencyKey(key)); }
 @Patch('reviews/:id') @Header('Cache-Control','no-store')
 edit(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.edit(auth,pathId(id),reviewInput(body,true),idempotencyKey(key)); }
 @Put('reviews/:id/reply') @Header('Cache-Control','no-store')
 reply(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.reply(auth,pathId(id),replyInput(body),idempotencyKey(key)); }
 @Post('reviews/:id/visibility') @Header('Cache-Control','no-store')
 visibility(@Headers('authorization') auth:string|undefined,@Headers('idempotency-key') key:string|undefined,@Param('id') id:string,@Body() body:unknown) { return this.service.visibility(auth,pathId(id),visibilityInput(body),idempotencyKey(key)); }
}
