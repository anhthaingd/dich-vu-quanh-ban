import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { Cursor } from '../../common/http/cursor.js';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';
import { MembersController } from './members.controller.js';
@Module({})
export class JobsModule {
    static register(secret: string): DynamicModule { return { module: JobsModule, controllers: [JobsController, MembersController], providers: [{ provide: JobsService, inject: [Pool, AuthService], useFactory: (pool: Pool, auth: AuthService) => new JobsService(pool, auth, new Cursor(secret)) }] }; }
}
