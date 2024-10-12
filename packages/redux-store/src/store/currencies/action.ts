import { Currencies } from '@bcpros/lixi-models/lib/escrow/currencies.model';
import { createAction } from '@reduxjs/toolkit';

export const getCurrencies = createAction('data/getCurrencies');
export const getCurrenciesSuccess = createAction<Currencies[]>('data/getCurrenciesSuccess');
export const getCurrenciesFailure = createAction<string>('data/getCurrenciesFailure');
