import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

import { getPaymenMethodsSuccess } from './action';

export const paymentMethodsAdapter = createEntityAdapter<PaymentMethodType>({});
const initialPaymentMethods = paymentMethodsAdapter.getInitialState({
  selectedPaymentMethodId: 0
});

export const paymentMethodReducer = createReducer(initialPaymentMethods, builder => {
  builder.addCase(getPaymenMethodsSuccess, (state, action) => {
    const paymentMethods = action.payload;
    paymentMethodsAdapter.setAll(state, paymentMethods);
  });
});
