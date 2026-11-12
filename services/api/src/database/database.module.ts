import {RuntimeLease} from './runtime-lease.js';
import { connectionOptions } from './connection.js';
import { AppLog } from '../logging/logger.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import type { Config } from '../config/environment.js';

@Module({})
export class DatabaseModule {
  static register(settings: Config, database: Pool | undefined, log: AppLog): DynamicModule {
    const pool = database ?? new Pool({ ...connectionOptions(settings.databaseUrl,settings.databaseCaFile), max: 10, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
    // The realtime lease pins one connection for the task lifetime; 5 left too few for concurrent requests (B00-31).
    // Only report a safe message; database errors may include credentials.
    const onError = (error: Error) => log.emit('db.unavailable', { operation: 'pool', error });
    pool.on('error', onError);
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: Pool, useValue: pool },
        {provide:RuntimeLease,useFactory:()=>new RuntimeLease(pool,settings.labRealtime)},
        { provide: 'DB_LIFECYCLE', useValue: {
          onApplicationShutdown: async () => {
            if (!database) await pool.end();
            pool.off('error', onError);
          },
        } },
      ],
      exports: [Pool,RuntimeLease],
    };
  }
}
