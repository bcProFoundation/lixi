import { createSelector } from 'reselect';

import { RootState } from '../store';

import { PageMessageState } from './state';

export const getPageMessageSessionState = createSelector(
  (state: RootState) => state.pageMessage,
  (state: PageMessageState) => state.pageMessageSessionState
);

export const getPageMessageSessionStateById = (id: string) =>
  createSelector(getPageMessageSessionState, pageMessageSessionState =>
    pageMessageSessionState?.find(x => x.pageMessageSessionId === id)
  );
