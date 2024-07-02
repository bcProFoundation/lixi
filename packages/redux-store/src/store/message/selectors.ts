import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { PageMessageSessionState } from './state';

import { pageMessageSessionAdapter } from './reducer';

export const getPageMessageSessionState = createSelector(
  (state: LixiStoreStateInterface) => state.pageMessage,
  (pageMessageSessionState: PageMessageSessionState) => pageMessageSessionState
);

const { selectAll, selectEntities, selectIds, selectTotal } = pageMessageSessionAdapter.getSelectors();

export const getAllPageMessageSession = createSelector(
  (state: LixiStoreStateInterface) => state.pageMessage,
  selectAll
);

export const getAllPageMessageSessionEntities = createSelector((state: LixiStoreStateInterface) => {
  if (state.pageMessage) {
    return state.pageMessage;
  } else {
    return {};
  }
}, selectEntities);

export const getPageMessageSessionById = (id: string) =>
  createSelector(getAllPageMessageSessionEntities, pageMessageSessions => {
    return pageMessageSessions?.[id];
  });
