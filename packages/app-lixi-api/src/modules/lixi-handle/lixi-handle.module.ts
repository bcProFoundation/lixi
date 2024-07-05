import { BullModule } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import _ from 'lodash';
import { AuthModule } from '../auth/auth.module';
import { LIXI_HANDLE_INDEXER_QUEUE } from './handle.constants';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueueAsync({
      name: LIXI_HANDLE_INDEXER_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: LIXI_HANDLE_INDEXER_QUEUE,
          connection: new IORedis({
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          })
        };
      }
    })
  ],
  controllers: [],
  providers: [
    Logger,
  ],
  exports: [Logger]
})
export class LixiHandleModule { }
