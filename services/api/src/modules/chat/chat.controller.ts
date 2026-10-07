import { Body, Controller, Get, Header, Headers, Inject, Param, Post, Put } from '@nestjs/common';
import { Query } from '@nestjs/common';
import { identifier, pageInput } from '../accounts/accounts.input.js';
import { ChatService } from './chat.service.js';
import { conversationInput, messageInput, messagesQuery, readInput } from './chat.input.js';
@Controller('conversations')
export class ChatController {
    constructor(
    @Inject(ChatService)
    private readonly service: ChatService) { }
    @Post()
    @Header('Cache-Control', 'no-store')
    open(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Body()
    body: unknown) { return this.service.open(auth, conversationInput(body), identifier(key)); }
    @Get()
    @Header('Cache-Control', 'no-store')
    list(
    @Headers('authorization')
    auth: string | undefined,
    @Query()
    q: Record<string, unknown>) { return this.service.list(auth, pageInput(q)); }
    @Get(':id/messages')
    @Header('Cache-Control', 'no-store')
    messages(
    @Headers('authorization')
    auth: string | undefined,
    @Param('id')
    id: string,
    @Query()
    q: Record<string, unknown>) { return this.service.messages(auth, identifier(id), messagesQuery(q)); }
    @Post(':id/messages')
    @Header('Cache-Control', 'no-store')
    send(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Param('id')
    id: string,
    @Body()
    body: unknown) { return this.service.send(auth, identifier(id), messageInput(body), identifier(key)); }
    @Put(':id/read')
    @Header('Cache-Control', 'no-store')
    read(
    @Headers('authorization')
    auth: string | undefined,
    @Headers('idempotency-key')
    key: string | undefined,
    @Param('id')
    id: string,
    @Body()
    body: unknown) { return this.service.read(auth, identifier(id), readInput(body), identifier(key)); }
}
