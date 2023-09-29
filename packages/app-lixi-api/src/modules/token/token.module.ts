import { Logger, Module } from '@nestjs/common';
import { NotificationModule } from 'src/common/modules/notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { TokenResolver } from './token.resolver';
import { FollowCacheService } from '../account/follow-cache.service';
import { TokenDanaCacheService } from './token-dana-cache.service';

@Module({
  imports: [
    AuthModule,
    NotificationModule
  ],
  controllers: [],
  providers: [
    TokenResolver,
    Logger,
    FollowCacheService,
    TokenDanaCacheService
  ],
  exports: []
})
export class TokenModule { }
