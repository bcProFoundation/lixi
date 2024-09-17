import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookmarkCacheService } from './bookmark-cache.service';
import { BookmarkResolver } from './bookmark.resolver';
import { PostCacheService } from '../page/post-cache.service';
import { TimelineItemService } from '../timeline/timeline-item.service';
import { EscrowOrderCacheService } from '../escrow/escrow-order/escrow-order-cache.service';
import { DisputeCacheService } from '../escrow/dispute/dispute-cache.service';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [
    BookmarkCacheService,
    BookmarkResolver,
    Logger,
    PostCacheService,
    TimelineItemService,
    EscrowOrderCacheService,
    DisputeCacheService
  ],
  exports: [BookmarkCacheService, BookmarkResolver, Logger]
})
export class BookmarkModule {}
