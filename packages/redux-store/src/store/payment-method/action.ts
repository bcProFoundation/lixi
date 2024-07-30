import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { createAction } from '@reduxjs/toolkit';

export const getPaymenMethods = createAction('data/getPaymenMethods');
export const getPaymenMethodsSuccess = createAction<PaymentMethodType[]>('data/getPaymenMethodsSuccess');
export const getPaymenMethodsFailure = createAction<string>('data/getPaymenMethodsFailure');
