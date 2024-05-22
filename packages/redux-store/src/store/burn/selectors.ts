import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { BurnState } from './state';

export const getLatestBurnForPost = createSelector(
  (state: LixiStoreStateInterface) => state.burn,
  (burnState: BurnState) => burnState.latestBurnForPost
);

export const getLatestBurnForPage = createSelector(
  (state: LixiStoreStateInterface) => state.burn,
  (burnState: BurnState) => burnState.latestBurnForPage
);

export const getLatestBurnForToken = createSelector(
  (state: LixiStoreStateInterface) => state.burn,
  (burnState: BurnState) => burnState.latestBurnForToken
);

export const getBurnQueue = createSelector(
  (state: LixiStoreStateInterface) => state.burn,
  (burnState: BurnState) => burnState.burnQueue
);

export const getFailQueue = createSelector(
  (state: LixiStoreStateInterface) => state.burn,
  (burnState: BurnState) => burnState.failQueue
);
