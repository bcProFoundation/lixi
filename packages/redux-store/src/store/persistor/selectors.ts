import { PersistState } from 'redux-persist';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

export const getIsBootstrapped = createSelector(
  (state: LixiStoreStateInterface) => state._persist,
  (state: PersistState) => (state && state.rehydrated ? state.rehydrated : false)
);
