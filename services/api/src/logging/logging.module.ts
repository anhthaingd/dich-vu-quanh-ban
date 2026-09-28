import { Module, type DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppLog, requestContext } from './logger.js';
import { randomUUID } from 'node:crypto';

@Module({})
export class LoggingModule {
  static register(log: AppLog): DynamicModule {
    return {
      module: LoggingModule, global: true,
      imports: [LoggerModule.forRoot({ pinoHttp: {
        logger: log.root, autoLogging: false,
        genReqId: () => requestContext.getStore()?.request_id ?? randomUUID(),
        serializers: { req: () => undefined, res: () => undefined },
      } })],
      providers: [{ provide: AppLog, useValue: log }], exports: [AppLog],
    };
  }
}
