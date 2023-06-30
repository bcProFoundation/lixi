import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessageResolver } from './message.resolver';
import { MessageGateway } from './message.gateway';
import { MeiliService } from '../page/meili.service';
import { PageMessageSessionResolver } from './pageMessageSession.resolver';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [MessageGateway, MessageResolver, PageMessageSessionResolver, Logger, MeiliService],
  exports: [MessageGateway, MessageResolver, Logger]
})
export class MessageModule {}
