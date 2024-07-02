import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { pageAdapter } from './reducer';
import { PageState } from './state';

const selectAccounts = (state: LixiStoreStateInterface) => state.accounts;
const selectSelectedAccount = createSelector(selectAccounts, state => state.selectedId);

const { selectAll, selectEntities, selectIds, selectTotal } = pageAdapter.getSelectors();

export const getAllPages = createSelector((state: LixiStoreStateInterface) => state.pages, selectAll);

export const getAllPagesEntities = createSelector((state: LixiStoreStateInterface) => state.pages, selectEntities);

export const getSelectedPageId = createSelector(
  (state: LixiStoreStateInterface) => state.pages,
  (state: PageState) => state.selectedId as string
);

export const pagesByAccountId = createSelector(
  (state: LixiStoreStateInterface) => state.pages,
  (state: PageState) => state.pagesByAccountId
);

export const getPageById = (id: string) => createSelector(getAllPagesEntities, pages => pages?.[id]);

export const getPageBySelectedAccount = createSelector([selectSelectedAccount, getAllPages], (accountId, pages) =>
  pages.find(page => page.pageAccountId === accountId)
);

export const getCurrentPageMessageSession = createSelector(
  (state: LixiStoreStateInterface) => state.pages,
  (state: PageState) => state.currentPageMessageSession
);
