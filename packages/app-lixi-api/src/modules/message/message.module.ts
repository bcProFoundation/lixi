import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessageResolver } from './message.resolver';
import { MessageGateway } from './message.gateway';
import { MeiliService } from '../page/meili.service';
import { PageMessageSessionResolver } from './pageMessageSession.resolver';
import { MessageSessionResolver } from './messageSession.resolver';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [
    MessageGateway,
    MessageResolver,
    PageMessageSessionResolver,
    MessageSessionResolver,
    Logger,
    MeiliService
  ],
  exports: [MessageGateway, MessageResolver, Logger]
})
export class MessageModule {}
