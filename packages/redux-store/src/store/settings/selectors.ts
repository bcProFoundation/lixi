import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { WebPushNotifConfig } from './model';
import { SettingsState } from './state';

export const getNavCollapsed = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.navCollapsed
);

export const getCurrentLocale = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.locale
);

export const getIntlInitStatus = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.initIntlStatus
);

export const getWebAuthnConfig = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.webAuthnConfig
);

export const getFilterPostsHome = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.filterPostsHome
);

export const getFilterPostsPage = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.filterPostsPage
);

export const getFilterPostsToken = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.filterPostsToken
);

export const getWebPushNotifConfig = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.webPushNotifConfig
);

export const getFilterPostsProfile = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.filterPostsProfile
);

export const getDeviceId = createSelector(getWebPushNotifConfig, (state: WebPushNotifConfig) =>
  state && state.deviceId ? state.deviceId : undefined
);

export const getCurrentThemes = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.currentThemes
);

export const getIsSystemThemes = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.isSystemThemes
);

export const getIsPostsByTime = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.isPostsByTime
);

export const getLevelFilter = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.levelFilter
);

export const getNegativeDanaStatus = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.negativeDana
);

export const getMinimumDanaFilter = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.minimumDanaFilter
);

export const getOfferFilterConfig = createSelector(
  (state: LixiStoreStateInterface) => state.settings,
  (state: SettingsState) => state.offerFilterConfig
);
