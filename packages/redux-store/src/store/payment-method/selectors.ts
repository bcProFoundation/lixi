import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { paymentMethodsAdapter } from './reducer';
import { PaymentMethodsState } from './state';

export const getPaymentMethodsState = createSelector(
  (state: LixiStoreStateInterface) => state.paymentMethods,
  (paymentMethods: PaymentMethodsState) => paymentMethods
);

const { selectAll, selectEntities, selectIds, selectTotal } = paymentMethodsAdapter.getSelectors();

export const getAllPaymentMethods = createSelector((state: LixiStoreStateInterface) => state.paymentMethods, selectAll);
