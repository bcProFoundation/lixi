import { Logger, Module } from '@nestjs/common';
import { DanaWsService } from './dana-ws.service';
import { DanaAdjustService } from './dana-adjust.service';
import { ConvertDanaResolver } from './convert-dana.resolver';
import { AuthModule } from '../auth/auth.module';
import { DanaIndexXPIService } from './index-block-xpi.service';
import { DanaIndexXECService } from './index-block-xec.service';
import { ConfigService } from '@nestjs/config';
import { INDEX_BLOCK_QUEUE } from './dana.constants';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import _ from 'lodash';
import { IndexBlockProcessor } from './index-block.process';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueueAsync({
      name: INDEX_BLOCK_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: INDEX_BLOCK_QUEUE,
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
    DanaWsService,
    DanaAdjustService,
    ConvertDanaResolver,
    IndexBlockProcessor,
    DanaIndexXECService,
    DanaIndexXPIService
  ],
  exports: [Logger]
})
export class DanaModule {}
