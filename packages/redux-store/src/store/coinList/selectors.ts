import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { CoinListAdapter } from './reducer';
import { CoinListState } from './state';

export const getCoinListState = createSelector(
  (state: LixiStoreStateInterface) => state.coinList,
  (coinList: CoinListState) => coinList
);

const { selectAll, selectEntities, selectIds, selectTotal } = CoinListAdapter.getSelectors();

export const getAllCoinList = createSelector((state: LixiStoreStateInterface) => state.coinList, selectAll);
