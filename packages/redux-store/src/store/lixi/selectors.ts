import { Lixi } from '@bcpros/lixi-models';
import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { childrenLixiesAdapter, lixiesAdapter } from './reducer';
import { LixiesState } from './state';

const selectAccounts = (state: LixiStoreStateInterface) => state.accounts;

const selectSelectedAccount = createSelector(selectAccounts, state => state.selectedId);

export const getLixiesState = createSelector(
  (state: LixiStoreStateInterface) => state.lixies,
  (lixies: LixiesState) => lixies
);

const { selectAll, selectEntities, selectIds, selectTotal } = lixiesAdapter.getSelectors();

const {
  selectAll: selectAllSubLixies,
  selectEntities: selectEntitiesSubLixies,
  selectIds: selectIdsSubLixies,
  selectTotal: selectTotalSubLixies
} = childrenLixiesAdapter.getSelectors();

export const getAllLixies = createSelector((state: LixiStoreStateInterface) => state.lixies, selectAll);

export const getAllLixiesEntities = createSelector((state: LixiStoreStateInterface) => state.lixies, selectEntities);

export const getSelectedLixiId = createSelector(
  (state: LixiStoreStateInterface) => state.lixies,
  (lixies: LixiesState) => lixies.selectedId as number
);

export const getLixiById = (id: number) => createSelector(getAllLixiesEntities, lixies => lixies?.[id]);

export const getLixiesBySelectedAccount = createSelector([selectSelectedAccount, getAllLixies], (accountId, lixies) =>
  lixies.filter(lixi => lixi && lixi.accountId === accountId && _.isNil(lixi.parentId))
);

export const getSelectedLixi = createSelector(
  [getLixiesBySelectedAccount, getSelectedLixiId],
  (lixies: Lixi[], selectedLixiId: number) => lixies.find(lixi => !_.isNil(lixi) && lixi.id === selectedLixiId)
);

export const getAllSubLixies = createSelector((state: LixiStoreStateInterface) => state.lixies.subLixies, selectAllSubLixies);

export const getHasMoreSubLixies = createSelector(getLixiesState, (lixies: LixiesState) => lixies.hasMoreSubLixies);

export const getLoadMoreSubLixiesStartId = createSelector(
  getLixiesState,
  (lixies: LixiesState) => lixies.currentSubLixiesStartId
);
