import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookmarkResolver } from './bookmark.resolver';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [BookmarkResolver, Logger],
  exports: [BookmarkResolver, Logger]
})
export class BookmarkModule {}
