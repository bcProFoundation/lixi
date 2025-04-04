import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

import { getPaymentMethodsSuccess } from './action';

export const paymentMethodsAdapter = createEntityAdapter<PaymentMethodType>({});
const initialPaymentMethods = paymentMethodsAdapter.getInitialState({
  selectedPaymentMethodId: 0
});

export const paymentMethodReducer = createReducer(initialPaymentMethods, builder => {
  builder.addCase(getPaymentMethodsSuccess, (state, action) => {
    const paymentMethods = action.payload;
    paymentMethodsAdapter.setAll(state, paymentMethods);
  });
});
