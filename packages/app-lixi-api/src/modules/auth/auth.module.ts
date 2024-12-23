import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountCacheService } from '../account/account-cache.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from './guards/gql-jwtauth.guard';
import { WsAuthGuardByPass } from './guards/wsauth.guard';
import { AccountModule } from '../account/account.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          limit: 5,
          ttl: 3600000 //an hour (3600000 ms)
        }
      ]
    }),
    forwardRef(() => AccountModule)
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GqlThrottlerGuard,
    JwtAuthGuard,
    WsAuthGuardByPass,
    GqlJwtAuthGuard,
    GqlJwtAuthGuardByPass
  ],
  exports: [AuthService, GqlThrottlerGuard, JwtAuthGuard, WsAuthGuardByPass, GqlJwtAuthGuard, GqlJwtAuthGuardByPass]
})
export class AuthModule {}
