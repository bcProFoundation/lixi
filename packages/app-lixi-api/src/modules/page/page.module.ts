import { BullModule } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import _ from 'lodash';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { AccountModule } from '../account/account.module';
import { FollowCacheService } from '../account/follow-cache.service';
import { AuthModule } from '../auth/auth.module';
import { HashtagModule } from '../hashtag/hashtag.module';
import { CommentDanaCacheService } from './comment-dana-cache.service';
import { CommentResolver } from './comment.resolver';
import { POST_FANOUT_QUEUE } from './constants/post.constants';
import { DanaViewScoreService } from './dana-view-score.service';
import { MeiliService } from './meili.service';
import { PageCacheService } from './page-cache.service';
import { PageDanaCacheService } from './page-dana-cache.service';
import { PageTimelineCacheService } from './page-timeline-cache.service';
import PageLoader from './page.loader';
import { PageResolver } from './page.resolver';
import { PostDanaCacheService } from './post-dana-cache.service';
import { PostFanoutProcessor } from './post-fanout.processor';
import PostLoader from './post.loader';
import { PostResolver } from './post.resolver';
import { PostCacheService } from './post-cache.service';
import { CommentCacheService } from './comment-cache.service';
import CommentableLoader from './commentable.loader';
import ImageUploadableLoader from './imageUploadable.loader';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    HashtagModule,
    AccountModule,
    BullModule.registerQueueAsync({
      name: POST_FANOUT_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          prefix: 'lixilotus:lixi',
          name: POST_FANOUT_QUEUE,
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
    PageResolver,
    Logger,
    PostResolver,
    MeiliService,
    CommentResolver,
    NotificationService,
    HashtagModule,
    FollowCacheService,
    PostLoader,
    PostFanoutProcessor,
    DanaViewScoreService,
    PageLoader,
    PageCacheService,
    PageTimelineCacheService,
    PageDanaCacheService,
    PostCacheService,
    PostDanaCacheService,
    CommentCacheService,
    CommentDanaCacheService,
    CommentableLoader,
    ImageUploadableLoader
  ],
  exports: [
    MeiliService,
    NotificationService,
    FollowCacheService,
    PostLoader,
    PostCacheService,
    DanaViewScoreService,
    PageDanaCacheService,
    PostDanaCacheService
  ]
})
export class PageModule {}
