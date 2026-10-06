import { Body, Controller, Header, Headers, Inject, Patch } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { profileInput } from './profile.input.js';
@Controller('me')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}
  @Patch() @Header('Cache-Control', 'no-store')
  edit(@Headers('authorization') authorization: string | undefined, @Headers('idempotency-key') key: string | undefined, @Body() body: unknown) {
    const parsed = profileInput(body, key);
    return this.accounts.edit(authorization, parsed.input, parsed.key);
  }
}
