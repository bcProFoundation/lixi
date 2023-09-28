import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookmarkCacheService } from './bookmark-cache.service';
import { BookmarkResolver } from './bookmark.resolver';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [BookmarkCacheService, BookmarkResolver, Logger],
  exports: [BookmarkCacheService, BookmarkResolver, Logger]
})
export class BookmarkModule {}
