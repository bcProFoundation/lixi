import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { currenciesAdapter } from './reducer';
import { CurrenciesState } from './state';

export const getCurrenciesState = createSelector(
  (state: LixiStoreStateInterface) => state.currencies,
  (currencies: CurrenciesState) => currencies
);

const { selectAll, selectEntities, selectIds, selectTotal } = currenciesAdapter.getSelectors();

export const getAllCurrencies = createSelector((state: LixiStoreStateInterface) => state.currencies, selectAll);
