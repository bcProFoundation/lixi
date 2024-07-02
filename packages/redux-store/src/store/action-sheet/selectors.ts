import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { ActionSheetState } from './state';

export const getActionSheet = createSelector(
  (state: LixiStoreStateInterface) => state.actionSheet,
  (state: ActionSheetState) => state.actionSheets
);
