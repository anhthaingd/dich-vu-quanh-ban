import { BadRequestException, Body, Controller, Get, Header, Headers, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { identifier, pageInput } from '../accounts/accounts.input.js';
import { actions,actionInput,draftInput,type InvoiceAction } from './invoices.input.js';
import { InvoicesService } from './invoices.service.js';
@Controller()
export class InvoicesController {
 constructor(@Inject(InvoicesService)private readonly service:InvoicesService){}
 @Get('jobs/:id/invoice') @Header('Cache-Control','no-store')
 get(@Headers('authorization')auth:string|undefined,@Param('id')id:string){return this.service.get(auth,identifier(id));}
 @Put('jobs/:id/invoice-draft') @Header('Cache-Control','no-store')
 save(@Headers('authorization')auth:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Body()body:unknown){return this.service.save(auth,identifier(id),draftInput(body),identifier(key));}
 @Post('invoices/:id/:action') @Header('Cache-Control','no-store')
 change(@Headers('authorization')auth:string|undefined,@Headers('idempotency-key')key:string|undefined,@Param('id')id:string,@Param('action')action:string,@Body()body:unknown){if(!actions.includes(action as InvoiceAction))throw new BadRequestException();return this.service.change(auth,identifier(id),action as InvoiceAction,actionInput(action as InvoiceAction,body),identifier(key));}
 @Get('me/points') @Header('Cache-Control','no-store')
 points(@Headers('authorization')auth:string|undefined){return this.service.points(auth);}
 @Get('partners/:id/wallet') @Header('Cache-Control','no-store')
 wallet(@Headers('authorization')auth:string|undefined,@Param('id')id:string){return this.service.wallet(auth,identifier(id));}
 @Get('me/points/ledger') @Header('Cache-Control','no-store')
 pointLedger(@Headers('authorization')auth:string|undefined,@Query()q:Record<string,unknown>){return this.service.ledger(auth,undefined,pageInput(q));}
 @Get('partners/:id/ledger') @Header('Cache-Control','no-store')
 partnerLedger(@Headers('authorization')auth:string|undefined,@Param('id')id:string,@Query()q:Record<string,unknown>){return this.service.ledger(auth,identifier(id),pageInput(q));}

}
