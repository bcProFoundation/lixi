import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputeResolver } from './dispute/dispute.resolver';
import { EscrowOrderResolver } from './escrow-order/escrow-order.resolver';
import EscrowOrderLoader from './escrow-order/escrow-order.loader';
import { OfferResolver } from './offer/offer.resolver';
import { PaymentMethodResolver } from './payment-method/paymentMethod.resolver';
import { OfferPaymentMethodResolver } from './payment-method/offerPaymentMethod.resolver';
import { OfferCacheService } from './offer/offer-cache.service';
import { CONTENT_FANOUT_QUEUE } from '../page/constants';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import _ from 'lodash';
import { TimelineItemService } from '../timeline/timeline-item.service';
import { PostCacheService } from '../page/post-cache.service';
import OfferLoader from './offer/offer.loader';
import { RedisKeySpaceNotification } from './redis-keyspace-notification.service';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { AccountCacheService } from '../account/account-cache.service';
import { EscrowOrderCacheService } from './escrow-order/escrow-order-cache.service';
import { DisputeCacheService } from './dispute/dispute-cache.service';
import DisputeLoader from './dispute/dispute.loader';

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
    }),
    NotificationModule
  ],
  providers: [
    DisputeResolver,
    DisputeCacheService,
    DisputeLoader,
    EscrowOrderResolver,
    EscrowOrderLoader,
    EscrowOrderCacheService,
    OfferResolver,
    OfferLoader,
    OfferCacheService,
    Logger,
    PaymentMethodResolver,
    OfferPaymentMethodResolver,
    TimelineItemService,
    PostCacheService,
    RedisKeySpaceNotification,
    AccountCacheService
  ],
  exports: [Logger]
})
export class EscrowModule {}
