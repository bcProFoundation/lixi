import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { EntityState } from '@reduxjs/toolkit';

export interface PaymentMethodsState extends EntityState<PaymentMethodType, number> {
  selectedPaymentMethodId: number;
}
