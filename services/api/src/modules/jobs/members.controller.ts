import { Controller, Get, Header, Headers, Inject, Param, Query } from '@nestjs/common';
import { identifier, pageInput } from '../accounts/accounts.input.js';
import { JobsService } from './jobs.service.js';
@Controller('partners')
export class MembersController {
    constructor(
    @Inject(JobsService)
    private readonly service: JobsService) { }
    @Get(':id/members')
    @Header('Cache-Control', 'no-store')
    list(
    @Headers('authorization')
    auth: string | undefined,
    @Param('id')
    id: string,
    @Query()
    q: Record<string, unknown>) { return this.service.members(auth, identifier(id), pageInput(q)); }
}
