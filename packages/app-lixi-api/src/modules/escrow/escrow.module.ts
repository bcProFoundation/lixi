import { Logger, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputeResolver } from './dispute.resolver';
import { EscrowOrderResolver } from './escrow-order.resolver';
import { OfferResolver } from './offer.resolver';
import { PaymentMethodResolver } from './paymentMethod.resolver';
import { OfferPaymentMethodResolver } from './offerPaymentMethod.resolver';

@Module({
  imports: [AuthModule],
  providers: [
    DisputeResolver,
    EscrowOrderResolver,
    OfferResolver,
    Logger,
    PaymentMethodResolver,
    OfferPaymentMethodResolver
  ],
  exports: [DisputeResolver, EscrowOrderResolver, OfferResolver, Logger]
})
export class EscrowModule {}
