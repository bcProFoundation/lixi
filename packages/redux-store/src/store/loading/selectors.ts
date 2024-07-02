import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { LoadingState } from './state';

export const getIsGlobalLoading = createSelector(
  (state: LixiStoreStateInterface) => state.loading,
  (state: LoadingState) => state.global
);
