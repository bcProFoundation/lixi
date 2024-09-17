import { RedisClientOptions, RedisModule } from '@songkeys/nestjs-redis';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpException, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule, ServeStaticModuleOptions } from '@nestjs/serve-static';
import { redisStore } from 'cache-manager-ioredis-yet';
import { FastifyRequest } from 'fastify';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import IORedis from 'ioredis';
import * as _ from 'lodash';
import { AcceptLanguageResolver, HeaderResolver, I18nModule } from 'nestjs-i18n';
import { MeiliSearchModule } from 'nestjs-meilisearch';
import { S3Module } from 'nestjs-s3';
import path, { join } from 'path';
import { CloudflareModule } from './common/modules/cloudflare/cloudflare.module';
import { NotificationModule } from './common/modules/notifications/notification.module';
import { GraphqlConfig } from './config/config.interface';
import configuration from './config/configuration';
import { HttpExceptionFilter } from './middlewares/exception.filter';
import { AccountModule } from './modules/account/account.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoreModule } from './modules/core/core.module';
import { HashtagModule } from './modules/hashtag/hashtag.module';
import { MessageModule } from './modules/message/message.module';
import { PageModule } from './modules/page/page.module';
import { WorshipModule } from './modules/worship/worship.module';
import { TempleModule } from './modules/temple/temple.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { TokenModule } from './modules/token/token.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { EventsAnalyticModule } from './modules/events-analytic/events-analytic.module';
import { BookmarkModule } from './modules/bookmark/bookmark.module';
import { BurnHistoryModule } from './modules/burn-history/burn-history.module';
import { ChronikModule } from 'nestjs-chronik';
import { DanaModule } from './modules/dana/dana.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { BoostFeeModule } from './modules/boost-fee/boostFee.modules';
import { TelegramBotModule } from './modules/telegram/telegram-bot.module';
import { TelegramBotModuleOptions } from './modules/telegram/telegram-bot.interface';
import { REDIS_CLIENTS_KEYSPACE_NOTIFICATION } from './common/redis/redis.constants';

//enabled serving multiple static for fastify
type FastifyServeStaticModuleOptions = ServeStaticModuleOptions & {
  serveStaticOptions: {
    decorateReply: boolean;
  };
};

export const serveStaticModule_images: FastifyServeStaticModuleOptions = {
  serveRoot: '/api/images',
  rootPath: join(__dirname, '..', 'public/images'),
  serveStaticOptions: {
    decorateReply: false
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          store: redisStore,
          host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
          port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
        };
      }
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          connection: new IORedis({
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          })
        };
      }
    }),
    PrismaModule,
    ServeStaticModule.forRoot(serveStaticModule_images),
    ChronikModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        networks: {
          xec: {
            clientUrls: [`${config.get<string>('CHRONIK_XEC_URL')}` || 'https://chronik.be.cash/xec'],
            nodeUrls: [`${config.get<string>('CHRONIK_XEC_URL')}`]
          },
          xpi: {
            clientUrls: [`${config.get<string>('CHRONIK_XPI_URL')}` || 'https://chronik.be.cash/xpi'],
            nodeUrls: [`${config.get<string>('CHRONIK_XPI_URL')}`]
          },
          xrg: {
            clientUrls: [`${config.get<string>('CHRONIK_XRG_URL')}` || 'https://chronik.be.cash/xrg'],
            nodeUrls: [`${config.get<string>('CHRONIK_XRG_URL')}`]
          }
        }
      })
    }),
    GraphQLModule.forRootAsync<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      useFactory: async (configService: ConfigService) => {
        const graphqlConfig = configService.get<GraphqlConfig>('graphql');
        return {
          graphiql: graphqlConfig?.playgroundEnabled || true,
          installSubscriptionHandlers: true,
          buildSchemaOptions: {
            numberScalarMode: 'integer'
          },
          sortSchema: graphqlConfig?.sortSchema || true,
          autoSchemaFile: graphqlConfig?.schemaDestination || './schema.graphql',
          debug: graphqlConfig?.debug,
          formatError: (error: GraphQLError) => {
            const graphQLFormattedError: GraphQLFormattedError = {
              message: (error?.extensions?.exception as any)?.response?.message || error?.message
            };
            return graphQLFormattedError;
          },
          errorFormatter: execution => {
            const [error] = execution.errors; // take first error
            const originalError = error?.originalError;
            if (originalError instanceof HttpException)
              return {
                statusCode: originalError?.getStatus(),
                response: { data: originalError?.getResponse() as any }
              };
            return { statusCode: 500, response: execution };
          },
          context: ({ req }: { req: FastifyRequest }) => ({
            req
          }),
          fieldResolverEnhancers: ['guards']
        };
      },

      inject: [ConfigService]
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true
      },
      resolvers: [{ use: HeaderResolver, options: ['lang'] }, AcceptLanguageResolver]
    }),
    MeiliSearchModule.forRootAsync({
      useFactory: () => ({
        host: process.env.MEILISEARCH_HOST!,
        apiKey: process.env.MEILISEARCH_MASTER_KEY
      })
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        enableAutoPipelining: true,
        config: [
          {
            keyPrefix: 'lixilotus:',
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          },
          {
            namespace: REDIS_CLIENTS_KEYSPACE_NOTIFICATION,
            keyPrefix: 'lixilotus:',
            host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
            port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
          }
        ]
      })
    }),
    WalletModule,
    AuthModule,
    CoreModule,
    NotificationModule,
    AccountModule,
    PageModule,
    TokenModule,
    WorshipModule,
    TempleModule,
    HashtagModule,
    MessageModule,
    TimelineModule,
    S3Module.forRootAsync({
      useFactory: () => ({
        config: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          endpoint: process.env.AWS_ENDPOINT,
          s3ForcePathStyle: true,
          signatureVersion: 'v4',
          region: 'us-west-001'
        }
      })
    }),
    CloudflareModule,
    EventsAnalyticModule,
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production'
    }),
    BookmarkModule,
    BurnHistoryModule,
    DanaModule,
    EscrowModule,
    BoostFeeModule,
    TelegramBotModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const localEcashBotToken = configService.get<string>('TELEGRAM_LOCAL_ECASH_BOT_TOKEN')!;

        return {
          local_ecash: localEcashBotToken
            ? {
                token: localEcashBotToken
              }
            : undefined
        } as TelegramBotModuleOptions;
      }
    })
  ],
  controllers: [],
  providers: [
    Logger,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ],
  exports: [RedisModule]
})
export class AppModule implements OnApplicationShutdown {
  onApplicationShutdown(signal: string) {
    console.trace(`Application shut down (signal: ${signal})`);
  }
}
