import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { createAction } from '@reduxjs/toolkit';

export const getPaymentMethods = createAction('data/getPaymentMethods');
export const getPaymentMethodsSuccess = createAction<PaymentMethodType[]>('data/getPaymentMethodsSuccess');
export const getPaymentMethodsFailure = createAction<string>('data/getPaymentMethodsFailure');
