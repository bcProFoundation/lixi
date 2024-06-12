import { Logger, Module } from '@nestjs/common';
import { DanaWsService } from './dana-ws.service';
import { DanaAdjustService } from './dana-adjust.service';
import { ConvertDanaResolver } from './convert-dana.resolver';
import { AuthModule } from '../auth/auth.module';
import { DanaIndexXPIService } from './index-block-xpi.service';
import { DanaIndexXECService } from './index-block-xec.service';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [Logger, DanaWsService, DanaAdjustService, ConvertDanaResolver, DanaIndexXPIService, DanaIndexXECService],
  exports: [Logger]
})
export class DanaModule {}
