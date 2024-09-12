import { Logger, Module } from '@nestjs/common';
import { TimelineResolver } from './timeline.resolver';
import { TimelineService } from './timeline.service';
import { AuthModule } from '../auth/auth.module';
import { PageModule } from '../page/page.module';
import { TimelineItemService } from './timeline-item.service';
import { PageCacheService } from '../page/page-cache.service';
import { EscrowModule } from '../escrow/escrow.module';
import { EscrowOrderCacheService } from '../escrow/escrow-order/escrow-order-cache.service';
import { DisputeCacheService } from '../escrow/dispute/dispute-cache.service';

@Module({
  imports: [AuthModule, PageModule, EscrowModule],
  providers: [
    Logger,
    TimelineService,
    TimelineItemService,
    TimelineResolver,
    PageCacheService,
    EscrowOrderCacheService,
    DisputeCacheService
  ],
  exports: []
})
export class TimelineModule {}
