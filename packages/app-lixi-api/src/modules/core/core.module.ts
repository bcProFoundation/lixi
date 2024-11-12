import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cors, { CorsOptions } from 'cors';
import IORedis from 'ioredis';
import _ from 'lodash';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { CloudflareModule } from '../../common/modules/cloudflare/cloudflare.module';
import { AccountModule } from '../account/account.module';
import { AuthModule } from '../auth/auth.module';
import { MessageModule } from '../message/message.module';
import { MeiliService } from '../page/meili.service';
import { PageModule } from '../page/page.module';
import { TokenModule } from '../token/token.module';
import { WalletModule } from '../wallet/wallet.module';
import { AccountController } from './account/account.controller';
import { AccountDanaProcessor } from './burn/account-dana.processor';
import { BurnFanoutProcessor } from './burn/burn-fanout.processor';
import { ACCOUNT_DANA_QUEUE, PAGE_DANA_QUEUE } from './burn/burn.constants';
import { BurnController } from './burn/burn.controller';
import { PageDanaProcessor } from './burn/page-dana.processor';
import { CategoryController } from './category/category.controller';
import { ClaimController } from './claim/claim.controller';
import { CountryController } from './country/country.controller';
import { EnvelopeController } from './envelope/envelope.controller';
import { FeatureFlagController } from './feature-flag/feature-flag.controller';
import { HeathController } from './healthcheck/heathcheck.controller';
import { LixiController } from './lixi/lixi.controller';
import { LixiService } from './lixi/lixi.service';
import { CreateSubLixiesEventsListener } from './lixi/processors/create-sub-lixies.eventslistener';
import { CreateSubLixiesProcessor } from './lixi/processors/create-sub-lixies.processor';
import { ExportSubLixiesEventsListener } from './lixi/processors/export-sub-lixies.eventslistener';
import { ExportSubLixiesProcessor } from './lixi/processors/export-sub-lixies.processor';
import { WithdrawSubLixiesEventsListener } from './lixi/processors/withdraw-sub-lixies.eventslistener';
import { WithdrawSubLixiesProcessor } from './lixi/processors/withdraw-sub-lixies.processor';
import { TranslateService } from './translate/translate.service';
import { UploadFilesController } from './upload/upload.controller';
import { UploadService } from './upload/upload.serivce';
import { ChronikModule } from 'nestjs-chronik';
import { SettingController } from './setting/setting.controller';
const baseCorsConfig: CorsOptions = {
  origin: process.env.BASE_URL ?? ''
};

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: ACCOUNT_DANA_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: ACCOUNT_DANA_QUEUE,
          connection: new IORedis({
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          })
        };
      }
    }),
    BullModule.registerQueueAsync({
      name: PAGE_DANA_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              delay: 1000,
              type: 'fixed'
            }
          },
          prefix: 'lixilotus:lixi',
          name: PAGE_DANA_QUEUE,
          connection: new IORedis({
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          })
        };
      }
    }),
    AuthModule,
    PageModule,
    TokenModule,
    AccountModule,
    NotificationModule,
    CloudflareModule,
    AccountModule,
    MessageModule,
    WalletModule.forRootAsync({
      inject: [ConfigService],
      imports: [ChronikModule],
      useFactory: () => {
        return {
          currencies: ['xpi', 'xec', 'xrg']
        };
      }
    })
  ],
  controllers: [
    AccountController,
    LixiController,
    ClaimController,
    EnvelopeController,
    HeathController,
    UploadFilesController,
    CountryController,
    SettingController,
    BurnController,
    CategoryController,
    FeatureFlagController
  ],
  providers: [
    LixiService,
    MeiliService,
    TranslateService,
    CreateSubLixiesProcessor,
    CreateSubLixiesEventsListener,
    WithdrawSubLixiesProcessor,
    ExportSubLixiesProcessor,
    ExportSubLixiesEventsListener,
    WithdrawSubLixiesEventsListener,
    BurnFanoutProcessor,
    AccountDanaProcessor,
    PageDanaProcessor,
    UploadService
  ],
  exports: [
    LixiService,
    CreateSubLixiesProcessor,
    CreateSubLixiesEventsListener,
    WithdrawSubLixiesProcessor,
    ExportSubLixiesProcessor,
    ExportSubLixiesEventsListener,
    WithdrawSubLixiesEventsListener
  ]
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cors(baseCorsConfig)).forRoutes({ path: '/api/claims/validate', method: RequestMethod.POST });
  }
}
