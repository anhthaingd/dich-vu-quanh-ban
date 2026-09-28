import { AppLog } from '../logging/logger.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { Pool } from 'pg';
import type { Config } from '../config/environment.js';

@Module({})
export class DatabaseModule {
  static register(settings: Config, database: Pool | undefined, log: AppLog): DynamicModule {
    const pool = database ?? new Pool({ connectionString: settings.databaseUrl, max: 5, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
    // Only report a safe message; database errors may include credentials.
    const onError = (error: Error) => log.emit('db.unavailable', { operation: 'pool', error });
    pool.on('error', onError);
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: Pool, useValue: pool },
        { provide: 'DB_LIFECYCLE', useValue: {
          onApplicationShutdown: async () => {
            if (!database) await pool.end();
            pool.off('error', onError);
          },
        } },
      ],
      exports: [Pool],
    };
  }
}
