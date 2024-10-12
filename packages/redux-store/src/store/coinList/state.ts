import { CoinList } from '@bcpros/lixi-models/lib/escrow/coin-list.model';
import { EntityState } from '@reduxjs/toolkit';

export interface CoinListState extends EntityState<CoinList, number> {
  selectedCoinId: number;
}
