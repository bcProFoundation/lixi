import { Logger, Module } from '@nestjs/common';
import { TimelineResolver } from './timeline.resolver';
import { TimelineService } from './timeline.service';
import { AuthModule } from '../auth/auth.module';
import { PageModule } from '../page/page.module';
import { TimelineItemService } from './timeline-item.service';

@Module({
  imports: [AuthModule, PageModule],
  providers: [Logger, TimelineService, TimelineItemService, TimelineResolver],
  exports: []
})
export class TimelineModule {}
