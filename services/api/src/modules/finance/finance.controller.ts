import {Body,Controller,Get,Header,Headers,HttpCode,Inject,Param,Post,Put,Query} from '@nestjs/common';
import {queueInput} from '../moderation/moderation.input.js';
import {FinanceService} from './finance.service.js';
import {bankInput,moneyInput,cancelInput,decisionInput,domain,reauthInput,depositInput,pathId,requestKey} from './finance.input.js';
@Controller()
export class FinanceController {
 constructor(@Inject(FinanceService)private service:FinanceService){}
 @Post('finance/reauthenticate') @HttpCode(200) @Header('Cache-Control','no-store')
 reauth(@Headers('authorization')h:string|undefined,@Body()b:unknown){const v=reauthInput(b);return this.service.reauthenticate(h,v.password,v.scope);}
 @Get('partners/:id/bank') @Header('Cache-Control','no-store')
 bank(@Headers('authorization')h:string|undefined,@Param('id')id:string){return this.service.getBank(h,pathId(id));}
 @Put('partners/:id/bank') @Header('Cache-Control','no-store')
 setBank(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.setBank(h,pathId(id),bankInput(b),requestKey(k));}
 @Post('partners/:id/bank/cancel') @HttpCode(200) @Header('Cache-Control','no-store')
 cancelBank(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.cancelBank(h,pathId(id),cancelInput(b),requestKey(k));}
 @Post('topups') @Header('Cache-Control','no-store')
 topup(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.create(h,'topups',moneyInput(b),requestKey(k));}
 @Post('payouts') @Header('Cache-Control','no-store')
 payout(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.create(h,'payouts',moneyInput(b,true),requestKey(k));}
 @Get('bank-accounts/:id') @Header('Cache-Control','no-store')
 bankDetail(@Headers('authorization')h:string|undefined,@Param('id')id:string){return this.service.get(h,'bank-accounts',pathId(id));}
 @Get('topups/:id') @Header('Cache-Control','no-store')
 topupDetail(@Headers('authorization')h:string|undefined,@Param('id')id:string){return this.service.get(h,'topups',pathId(id));}
 @Get('payouts/:id') @Header('Cache-Control','no-store')
 payoutDetail(@Headers('authorization')h:string|undefined,@Param('id')id:string){return this.service.get(h,'payouts',pathId(id));}
 @Post('topups/:id/cancel') @HttpCode(200) @Header('Cache-Control','no-store')
 cancelTopup(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.cancel(h,'topups',pathId(id),cancelInput(b),requestKey(k));}
 @Post('payouts/:id/cancel') @HttpCode(200) @Header('Cache-Control','no-store')
 cancelPayout(@Headers('authorization')h:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.cancel(h,'payouts',pathId(id),cancelInput(b),requestKey(k));}
 @Get('partners/:id/finance-history/:domain') @Header('Cache-Control','no-store')
 history(@Headers('authorization')h:string|undefined,@Param('id')id:string,@Param('domain')d:string,@Query()q:Record<string,unknown>){return this.service.list(h,undefined,domain(d),queueInput(q),pathId(id));}
 @Get('admin/topups') @Header('Cache-Control','no-store')
 topups(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(h,t,'topups',queueInput(q));}
 @Get('admin/payouts') @Header('Cache-Control','no-store')
 payouts(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(h,t,'payouts',queueInput(q));}
 @Get('admin/bank-accounts') @Header('Cache-Control','no-store')
 banks(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Query()q:Record<string,unknown>){return this.service.list(h,t,'bank-accounts',queueInput(q));}
 @Get('admin/topups/:id') @Header('Cache-Control','no-store')
 adminTopup(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.adminGet(h,t,'topups',pathId(id));}
 @Get('admin/payouts/:id') @Header('Cache-Control','no-store')
 adminPayout(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.adminGet(h,t,'payouts',pathId(id));}
 @Get('admin/bank-accounts/:id') @Header('Cache-Control','no-store')
 adminBank(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Param('id')id:string){return this.service.adminGet(h,t,'bank-accounts',pathId(id));}
 @Post('admin/topups/:id/decision') @HttpCode(200) @Header('Cache-Control','no-store')
 topupDecision(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.decision(h,t,'topups',pathId(id),decisionInput(b),requestKey(k));}
 @Post('admin/payouts/:id/decision') @HttpCode(200) @Header('Cache-Control','no-store')
 payoutDecision(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.decision(h,t,'payouts',pathId(id),decisionInput(b),requestKey(k));}
 @Post('admin/bank-accounts/:id/decision') @HttpCode(200) @Header('Cache-Control','no-store')
 bankDecision(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Param('id')id:string,@Body()b:unknown){return this.service.decision(h,t,'bank-accounts',pathId(id),decisionInput(b),requestKey(k));}
 @Post('admin/finance-simulator/deposits') @Header('Cache-Control','no-store')
 deposit(@Headers('authorization')h:string|undefined,@Headers('x-admin-session')t:string|undefined,@Headers('idempotency-key')k:string|undefined,@Body()b:unknown){return this.service.deposit(h,t,depositInput(b),requestKey(k));}
}
