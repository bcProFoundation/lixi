import { Logger, Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AccountCacheService } from './account-cache.service';
import { AccountDanaCacheService } from './account-dana-cache.service';
import AccountLoader from './account.loader';
import { AccountResolver } from './account.resolver';
import { FollowCacheService } from './follow-cache.service';
import { FollowResolver } from './follow.resolver';
import { WalletModule } from '../wallet/wallet.module';

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
    AccountLoader
  ],
  exports: [FollowCacheService, AccountCacheService, AccountDanaCacheService]
})
export class AccountModule {}
