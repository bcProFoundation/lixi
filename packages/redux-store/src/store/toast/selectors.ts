import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { ToastState } from './state';

export const getToastNotification = createSelector(
  (state: LixiStoreStateInterface) => state.toast,
  (state: ToastState) => state.event
);
