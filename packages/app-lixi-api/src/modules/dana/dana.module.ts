import { Logger, Module } from '@nestjs/common';
import { DanaWsService } from './dana-ws.service';
import { DanaAdjustService } from './dana-adjust.service';

@Module({
  imports: [],
  controllers: [],
  providers: [Logger, DanaWsService, DanaAdjustService],
  exports: [Logger]
})
export class DanaModule {}
