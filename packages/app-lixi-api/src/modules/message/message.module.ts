import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessageResolver } from './message.resolver';
import { MeiliService } from '../page/meili.service';
import { PageMessageSessionResolver } from './page-message-session.resolver';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { PageMessageSessionCacheService } from './page-message-session-cache.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    WalletModule.forRootAsync({
      useFactory: () => {
        return {
          currencies: ['XPI']
        };
      }
    })
  ],
  controllers: [],
  providers: [MessageResolver, PageMessageSessionResolver, Logger, MeiliService, PageMessageSessionCacheService],
  exports: [MessageResolver, Logger, PageMessageSessionCacheService]
})
export class MessageModule {}
