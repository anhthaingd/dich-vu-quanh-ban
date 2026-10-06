import { Body, Controller, Header, Headers, Inject, Patch, Get, Post, Put, Param, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { profileInput } from './profile.input.js';
import { AddressesService } from './addresses.service.js';
import { SessionsService } from './sessions.service.js';
import { addressInput, emptyBody, identifier, pageInput } from './accounts.input.js';
@Controller('me')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService,
    @Inject(AddressesService) private readonly addresses: AddressesService,
    @Inject(SessionsService) private readonly sessions: SessionsService) {}
  @Patch() @Header('Cache-Control', 'no-store')
  edit(@Headers('authorization') authorization: string | undefined, @Headers('idempotency-key') key: string | undefined, @Body() body: unknown) {
    const parsed = profileInput(body, key);
    return this.accounts.edit(authorization, parsed.input, parsed.key);
  }

  @Get('sessions') @Header('Cache-Control', 'no-store')
  listSessions(@Headers('authorization') auth: string | undefined, @Query() query: Record<string, unknown>) {
    return this.sessions.list(auth, pageInput(query));
  }
  @Post('sessions/:id/revoke') @Header('Cache-Control', 'no-store')
  revoke(@Headers('authorization') auth: string | undefined, @Headers('idempotency-key') key: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    emptyBody(body); return this.sessions.revoke(auth, identifier(id), identifier(key));
  }
  @Get('addresses') @Header('Cache-Control', 'no-store')
  listAddresses(@Headers('authorization') auth: string | undefined, @Query() query: Record<string, unknown>) {
    return this.addresses.list(auth, pageInput(query));
  }
  @Post('addresses') @Header('Cache-Control', 'no-store')
  addAddress(@Headers('authorization') auth: string | undefined, @Headers('idempotency-key') key: string | undefined, @Body() body: unknown) {
    return this.addresses.save(auth, null, addressInput(body, false), identifier(key));
  }
  @Put('addresses/:id') @Header('Cache-Control', 'no-store')
  editAddress(@Headers('authorization') auth: string | undefined, @Headers('idempotency-key') key: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    return this.addresses.save(auth, identifier(id), addressInput(body, true), identifier(key));
  }
  @Post('addresses/:id/archive') @Header('Cache-Control', 'no-store')
  archiveAddress(@Headers('authorization') auth: string | undefined, @Headers('idempotency-key') key: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    emptyBody(body); return this.addresses.archive(auth, identifier(id), identifier(key));
  }
}
