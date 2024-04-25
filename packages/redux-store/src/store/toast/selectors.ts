import { createSelector } from 'reselect';

import { RootState } from '../store';

import { ToastState } from './state';

export const getToastTypeNotification = createSelector(
  (state: RootState) => state.toast,
  (state: ToastState) => state.type
);

export const getToasConfigtNotification = createSelector(
  (state: RootState) => state.toast,
  (state: ToastState) => state.config
);
