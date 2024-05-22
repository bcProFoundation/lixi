import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { notificationsAdapter } from './reducer';
import { NotificationsState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = notificationsAdapter.getSelectors();

export const getAllNotifications = createSelector((state: LixiStoreStateInterface) => state.notifications, selectAll);

export const getAllNotificationsEntities = createSelector((state: LixiStoreStateInterface) => state.notifications, selectEntities);

export const getIsServerStatusOn = createSelector(
  (state: LixiStoreStateInterface) => state.notifications,
  (state: NotificationsState) => state.serverStatusOn
);
