import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

import { getCoinListSuccess } from './action';
import { CoinList } from '@bcpros/lixi-models/lib/escrow/coin-list.model';

export const CoinListAdapter = createEntityAdapter<CoinList>({});
const initialCoinList = CoinListAdapter.getInitialState({
  selectedCoinListId: 0
});

export const CoinListReducer = createReducer(initialCoinList, builder => {
  builder.addCase(getCoinListSuccess, (state, action) => {
    const coinList = action.payload;
    CoinListAdapter.setAll(state, coinList);
  });
});
