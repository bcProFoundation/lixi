import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputeResolver } from './dispute.resolver';
import { EscrowOrderResolver } from './escrow-order.resolver';
import { OfferResolver } from './offer.resolver';
import { PaymentMethodResolver } from './paymentMethod.resolver';
import { OfferPaymentMethodResolver } from './offerPaymentMethod.resolver';
import { OfferCacheService } from './offer-cache.service';
import { CONTENT_FANOUT_QUEUE } from '../page/constants';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import _ from 'lodash';
import { TimelineItemService } from '../timeline/timeline-item.service';
import { PostCacheService } from '../page/post-cache.service';
import OfferLoader from './offer.loader';
import { RedisKeySpaceNotification } from './redis-keyspace-notification.service';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueueAsync({
      name: CONTENT_FANOUT_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: CONTENT_FANOUT_QUEUE,
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
  providers: [
    DisputeResolver,
    EscrowOrderResolver,
    OfferResolver,
    OfferLoader,
    OfferCacheService,
    Logger,
    PaymentMethodResolver,
    OfferPaymentMethodResolver,
    TimelineItemService,
    PostCacheService,
    RedisKeySpaceNotification
  ],
  exports: [Logger]
})
export class EscrowModule {}
