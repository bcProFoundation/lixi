import { CoinList } from '@bcpros/lixi-models/lib/escrow/coin-list.model';
import { createAction } from '@reduxjs/toolkit';

export const getCoinList = createAction('data/getCoinList');
export const getCoinListSuccess = createAction<CoinList[]>('data/getCoinListSuccess');
export const getCoinListFailure = createAction<string>('data/getCoinListFailure');
