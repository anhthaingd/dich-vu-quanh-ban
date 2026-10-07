import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { Cursor } from '../../common/http/cursor.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
@Module({})
export class ChatModule {
    static register(secret: string): DynamicModule { return { module: ChatModule, controllers: [ChatController], providers: [{ provide: ChatService, inject: [Pool, AuthService], useFactory: (pool: Pool, auth: AuthService) => new ChatService(pool, auth, new Cursor(secret)) }] }; }
}
