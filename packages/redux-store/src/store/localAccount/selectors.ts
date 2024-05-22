import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { localAccountsAdapter } from './reducer';
import { LocalUserAccountsState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = localAccountsAdapter.getSelectors();

export const getAllLocalUserAccounts = createSelector((state: LixiStoreStateInterface) => state.localAccounts, selectAll);

export const getAllLocalUserAccountsEntities = createSelector(
  (state: LixiStoreStateInterface) => state.localAccounts,
  selectEntities
);

export const getSelectedLocalUserAccountId = createSelector(
  (state: LixiStoreStateInterface) => state.localAccounts,
  (accounts: LocalUserAccountsState) => accounts.selectedId
);

export const getSelectedLocalUserAccount = createSelector(
  (state: LixiStoreStateInterface) => state.localAccounts,
  (accounts: LocalUserAccountsState) => (accounts.selectedId ? accounts.entities[accounts.selectedId] : undefined)
);

export const getLocalUserAccountById = (id: string) =>
  createSelector(getAllLocalUserAccountsEntities, accounts => accounts?.[id]);
