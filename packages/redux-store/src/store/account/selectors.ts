import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { accountsAdapter } from './reducer';
import { AccountsState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = accountsAdapter.getSelectors();

export const getAllAccounts = createSelector((state: LixiStoreStateInterface) => state.accounts, selectAll);

export const getAllAccountsEntities = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  selectEntities
);

export const getAllAccountsIds = createSelector((state: LixiStoreStateInterface) => state.accounts, selectIds);

export const getSelectedAccountId = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.selectedId
);

export const getSelectedAccount = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => (accounts.selectedId ? accounts.entities[accounts.selectedId] : undefined)
);

export const getAccountById = (id: number) => createSelector(getAllAccountsEntities, accounts => accounts?.[id]);
export const getAccountInfoTemp = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.accountInfoTemp
);

export const getEnvelopeUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.envelopeUpload
);

export const getAccountCoverUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.accountCoverUpload
);

export const getAccountAvatarUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.accountAvatarUpload
);

export const getPageCoverUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.pageCoverUpload
);

export const getPageAvatarUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.pageAvatarUpload
);

export const getPostCoverUploads = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.postCoverUploads
);

export const getProductImageUploads = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.productImageUploads
);

export const getMessageUploads = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.messageUploads
);

export const getCommentUpload = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.commentUpload
);

export const getEditorCache = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.editorCache
);

export const getLeaderBoard = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.leaderBoard
);

export const getTransactionStatus = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.transactionReady
);

export const getGraphqlRequestStatus = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.graphqlRequestLoading
);

export const getRecentVisitedPeople = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.recentVisitedPeople
);

export const getRecentHashtagAtHome = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtHome
);

export const getRecentHashtagAtPages = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtPages
);

export const getRecentHashtagAtToken = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.recentHashtagAtToken
);

export const getScrollToCommentId = createSelector(
  (state: LixiStoreStateInterface) => state.accounts,
  (accounts: AccountsState) => accounts.scrollToCommentId
);
