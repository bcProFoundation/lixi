import { Logger, Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BurnHistoryResolver } from './burn-history.resolver';
import { BurnHistoryCacheService } from './burn-history-cache.service';
import { PageModule } from '../page/page.module';

@Module({
  imports: [AuthModule, forwardRef(() => PageModule)],
  controllers: [],
  providers: [BurnHistoryCacheService, BurnHistoryResolver, Logger],
  exports: [BurnHistoryCacheService, BurnHistoryResolver, Logger]
})
export class BurnHistoryModule {}
