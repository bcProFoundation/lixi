import { Currencies } from '@bcpros/lixi-models/lib/escrow/currencies.model';
import { EntityState } from '@reduxjs/toolkit';

export interface CurrenciesState extends EntityState<Currencies, number> {
  selectedCurrencyId: number;
}
