import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputeResolver } from './dispute.resolver';
import { EscrowOrderResolver } from './escrow-order.resolver';
import { OfferResolver } from './offer.resolver';

@Module({
  imports: [AuthModule],
  providers: [DisputeResolver, EscrowOrderResolver, OfferResolver, Logger],
  exports: [DisputeResolver, EscrowOrderResolver, OfferResolver, Logger]
})
export class EscrowModule {}
