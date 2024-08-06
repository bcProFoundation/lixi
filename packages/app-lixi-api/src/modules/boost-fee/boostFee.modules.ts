import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PageModule } from '../page/page.module';
import { BoostFeeResolver } from './boostFee.resolver';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import _ from 'lodash';
import { BOOST_FANOUT_QUEUE } from './boost.constants';
import { ConfigService } from '@nestjs/config';
import { BoostFanoutProcessor } from './boost-fanout.process';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueueAsync({
      name: BOOST_FANOUT_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: BOOST_FANOUT_QUEUE,
          connection: new IORedis({
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          })
        };
      }
    }),
    PageModule
  ],
  providers: [Logger, BoostFeeResolver, BoostFanoutProcessor],
  exports: [Logger]
})
export class BoostFeeModule {}
