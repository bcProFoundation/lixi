import { createSelector } from 'reselect';

import { RootState } from '../store';

import { accountsAdapter } from './reducer';
import { AccountsState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = accountsAdapter.getSelectors();

export const getAllAccounts = createSelector((state: RootState) => state.accounts, selectAll);

export const getAllAccountsEntities = createSelector((state: RootState) => state.accounts, selectEntities);

export const getAllAccountsIds = createSelector((state: RootState) => state.accounts, selectIds);

export const getSelectedAccountId = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.selectedId
);

export const getSelectedAccount = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => (accounts.selectedId ? accounts.entities[accounts.selectedId] : undefined)
);

export const getAccountById = (id: number) => createSelector(getAllAccountsEntities, accounts => accounts?.[id]);
export const getAccountInfoTemp = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.accountInfoTemp
);

export const getEnvelopeUpload = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.envelopeUpload
);

export const getAccountCoverUpload = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.accountCoverUpload
);

export const getAccountAvatarUpload = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.accountAvatarUpload
);

export const getPageCoverUpload = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.pageCoverUpload
);

export const getPageAvatarUpload = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.pageAvatarUpload
);

export const getPostCoverUploads = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.postCoverUploads
);

export const getProductImageUploads = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.productImageUploads
);

export const getMessageUploads = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.messageUploads
);

export const getEditorCache = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.editorCache
);

export const getLeaderBoard = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.leaderBoard
);

export const getTransactionStatus = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.transactionReady
);

export const getGraphqlRequestStatus = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.graphqlRequestLoading
);

export const getRecentVisitedPeople = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.recentVisitedPeople
);

export const getRecentHashtagAtHome = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtHome
);

export const getRecentHashtagAtPages = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtPages
);

export const getRecentHashtagAtToken = createSelector(
  (state: RootState) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtToken
);
