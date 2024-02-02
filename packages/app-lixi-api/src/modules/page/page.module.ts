import { BullModule } from '@nestjs/bullmq';
import { Logger, Module, forwardRef } from '@nestjs/common';
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
import { CONTENT_FANOUT_QUEUE, REMOVE_POST_FANOUT_QUEUE } from './constants';
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
import CommentLoader from './comment.loader';
import { EventCacheService } from './events/event-cache.service';
import { PollCacheService } from './polls/poll-cache.service';
import { EventResolver } from './events/event.resolver';
import { PollResolver } from './polls/poll.resolver';
import PollLoader from './polls/poll.loader';
import EventLoader from './events/event.loader';
import { ProductResolver } from './products/product.resolver';
import TimelineableLoader from './timelineable.loader';
import { ProductCacheService } from './products/product-cache.service';
import { BookmarkCacheService } from '../bookmark/bookmark-cache.service';
import BookmarkLoader from '../bookmark/bookmark.loader';
import FollowScoreLoader from '../account/follow-score.loader';
import { RemovePostFanoutProcessor } from './remove-post-fanout.processor';
import { PollOptionResolver } from './polls/poll-option.resolver';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    HashtagModule,
    AccountModule,
    BullModule.registerQueueAsync(
      {
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
      },
      {
        name: REMOVE_POST_FANOUT_QUEUE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          return {
            prefix: 'lixilotus:lixi',
            name: REMOVE_POST_FANOUT_QUEUE,
            connection: new IORedis({
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
              port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
            })
          };
        }
      }
    )
  ],
  providers: [
    PageResolver,
    Logger,
    PostResolver,
    EventResolver,
    PollResolver,
    PollOptionResolver,
    ProductResolver,
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
    EventCacheService,
    PollCacheService,
    ProductCacheService,
    PostDanaCacheService,
    PollLoader,
    EventLoader,
    CommentCacheService,
    CommentDanaCacheService,
    CommentableLoader,
    ImageUploadableLoader,
    CommentLoader,
    CommentableLoader,
    TimelineableLoader,
    BookmarkCacheService,
    BookmarkLoader,
    FollowScoreLoader,
    RemovePostFanoutProcessor
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
