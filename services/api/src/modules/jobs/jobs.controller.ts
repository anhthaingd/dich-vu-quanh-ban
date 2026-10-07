import { Body, Controller, Get, Header, Headers, HttpCode, Inject, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { identifier } from '../accounts/accounts.input.js';
import { JobsService } from './jobs.service.js';
import { jobCreateInput, jobChangeInput, jobsQuery, type JobAction } from './jobs.input.js';
@Controller('jobs')
export class JobsController {
    constructor(
    @Inject(JobsService)
    private readonly service: JobsService) { }
    @Get()
    @Header('Cache-Control', 'no-store')
    list(
    @Headers('authorization')
    auth: string | undefined,
    @Query()
    query: Record<string, unknown>) { return this.service.list(auth, jobsQuery(query)); }
    @Post()
    @Header('Cache-Control', 'no-store')
    create(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Body()
    body: unknown) { return this.service.create(auth, jobCreateInput(body), identifier(key)); }
    @Get(':id')
    @Header('Cache-Control', 'no-store')
    get(
    @Headers('authorization')
    auth: string | undefined,
    @Param('id')
    id: string) { return this.service.get(auth, identifier(id)); }
    @Post(':id/accept')
    @HttpCode(200)
    @Header('Cache-Control', 'no-store')
    accept(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Param('id')
    id: string,
    @Body()
    body: unknown) { return this.service.change(auth, identifier(id), 'accept', jobChangeInput('accept', body), identifier(key)); }
    @Post(':id/reschedule')
    @HttpCode(200)
    @Header('Cache-Control', 'no-store')
    reschedule(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Param('id')
    id: string,
    @Body()
    body: unknown) { return this.service.change(auth, identifier(id), 'reschedule', jobChangeInput('reschedule', body), identifier(key)); }
    @Post(':id/:action')
    @Header('Cache-Control', 'no-store')
    change(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Param('id')
    id: string,
    @Param('action')
    action: string,
    @Body()
    body: unknown) {
        if (!['decline', 'withdraw', 'stop', 'assignments'].includes(action))
            throw new BadRequestException();
        return this.service.change(auth, identifier(id), action as JobAction, jobChangeInput(action as JobAction, body), identifier(key));
    }
}
