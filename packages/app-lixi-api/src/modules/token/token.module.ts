import { Logger, Module } from '@nestjs/common';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { TokenResolver } from './token.resolver';
import { FollowCacheService } from '../account/follow-cache.service';
import { TokenDanaCacheService } from './token-dana-cache.service';
import TokenLoader from './token.loader';
import { TokenTimelineCacheService } from './token-timeline-cache.service';
import { TokenCacheService } from './token-cache.service';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [],
  providers: [
    TokenResolver,
    Logger,
    FollowCacheService,
    TokenCacheService,
    TokenDanaCacheService,
    TokenLoader,
    TokenTimelineCacheService
  ],
  exports: [
    TokenCacheService,
    TokenDanaCacheService,
    TokenLoader
  ]
})
export class TokenModule { }
