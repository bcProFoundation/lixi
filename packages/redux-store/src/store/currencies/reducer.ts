import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

import { getCurrenciesSuccess } from './action';
import { Currencies } from '@bcpros/lixi-models/lib/escrow/currencies.model';

export const currenciesAdapter = createEntityAdapter<Currencies>({});
const initialCurrencies = currenciesAdapter.getInitialState({
  selectedCurrenciesId: 0
});

export const currenciesReducer = createReducer(initialCurrencies, builder => {
  builder.addCase(getCurrenciesSuccess, (state, action) => {
    const currencies = action.payload;
    currenciesAdapter.setAll(state, currencies);
  });
});
