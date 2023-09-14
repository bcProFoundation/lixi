import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard';
import { JwtStrategy } from './jwt.strategy';
import { AccountModule } from '../account/account.module';
import { AccountCacheService } from '../account/account-cache.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRoot({
      limit: 30,
      ttl: 60
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GqlThrottlerGuard, AccountCacheService],
  exports: [AuthService, GqlThrottlerGuard]
})
export class AuthModule { }
