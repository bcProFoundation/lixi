import { Logger, Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AccountCacheService } from './account-cache.service';
import { AccountDanaCacheService } from './account-dana-cache.service';
import AccountLoader from './account.loader';
import { AccountResolver } from './account.resolver';
import { FollowCacheService } from './follow-cache.service';
import { FollowResolver } from './follow.resolver';
import TotalDanaViewScoreLoader from './total-dana-view-score.loader';
import { DanaViewScoreService } from '../page/dana-view-score.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => NotificationModule)],
  controllers: [],
  providers: [
    AccountResolver,
    FollowResolver,
    Logger,
    FollowCacheService,
    AccountCacheService,
    AccountDanaCacheService,
    AccountLoader,
    TotalDanaViewScoreLoader,
    DanaViewScoreService
  ],
  exports: [FollowCacheService, AccountCacheService, AccountDanaCacheService, TotalDanaViewScoreLoader]
})
export class AccountModule {}
