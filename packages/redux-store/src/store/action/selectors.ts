import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { ActionState } from './state';

export const getAction = createSelector(
  (state: LixiStoreStateInterface) => state.action,
  (state: ActionState) => state
);
