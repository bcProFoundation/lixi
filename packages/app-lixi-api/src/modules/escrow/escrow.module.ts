import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrderController } from './order.controller';
import { OfferController } from './offer.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrderController, OfferController],
  providers: [Logger],
  exports: [Logger]
})
export class EscrowModule {}
