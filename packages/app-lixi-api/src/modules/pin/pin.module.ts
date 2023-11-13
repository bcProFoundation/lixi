import { Logger, Module } from '@nestjs/common';
import { PinResolver } from './pin.resolver';
import { AuthModule } from '../auth/auth.module';
import { PinCacheService } from './pin-cache.service';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [PinResolver, PinCacheService, Logger],
  exports: [PinResolver, PinCacheService]
})
export class PinModule {}
