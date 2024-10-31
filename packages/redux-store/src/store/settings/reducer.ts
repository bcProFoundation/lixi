import { FilterType } from '@bcpros/lixi-models/lib/filter';
import { createReducer } from '@reduxjs/toolkit';

import {
  saveAllowPushNotification,
  saveBurnFilter,
  saveLevelFilter,
  savePostsByTimeFilter,
  saveWebAuthnConfig,
  saveWebPushNotifConfig,
  setCurrentThemes,
  setInitIntlStatus,
  setIsSystemThemes,
  toggleCollapsedSideNav,
  updateLanguage,
  changeCurrentLocale,
  setNegativeDanaStatus,
  saveMinimumDanaFilter,
  saveOfferFilterConfig,
  updateTimeBackup
} from './actions';
import { SettingsState } from './state';
// import { SearchBoxType } from '@bcpros/lixi-models/lib/search';

const initialState: SettingsState = {
  navCollapsed: true,
  locale: 'en',
  initIntlStatus: false,
  webAuthnConfig: null,
  webPushNotifConfig: {
    allowPushNotification: false,
    deviceId: null
  },
  filterPostsHome: 10,
  filterPostsPage: 0,
  filterPostsToken: 1,
  filterPostsProfile: 1,
  isPostsByTime: false,
  currentThemes: 'system',
  isSystemThemes: true,
  levelFilter: 3,
  negativeDana: false,
  minimumDanaFilter: 1,
  offerFilterConfig: {
    countryId: null,
    countryName: '',
    stateId: null,
    stateName: '',
    paymentMethodIds: []
  },
  timeBackupSeed: null
};

export const settingsReducer = createReducer(initialState, builder => {
  builder
    .addCase(toggleCollapsedSideNav, (state, action) => {
      state.navCollapsed = action.payload;
    })
    .addCase(updateLanguage, (state, action) => {
      state.locale = action.payload;
    })
    .addCase(setInitIntlStatus, (state, action) => {
      state.initIntlStatus = action.payload;
    })
    .addCase(saveWebAuthnConfig, (state, action) => {
      state.webAuthnConfig = action.payload;
    })
    .addCase(saveWebPushNotifConfig, (state, action) => {
      state.webPushNotifConfig = action.payload;
    })
    .addCase(saveAllowPushNotification, (state, action) => {
      state.webPushNotifConfig.allowPushNotification = action.payload;
    })
    .addCase(saveBurnFilter, (state, action) => {
      const { filterForType, filterValue } = action.payload;
      switch (filterForType) {
        case FilterType.PostsHome:
          state.filterPostsHome = filterValue;
          break;
        case FilterType.PostsPage:
          state.filterPostsPage = filterValue;
          break;
        case FilterType.PostsToken:
          state.filterPostsToken = filterValue;
          break;
        case FilterType.PostsProfile:
          state.filterPostsProfile = filterValue;
          break;
      }
    })
    .addCase(savePostsByTimeFilter, (state, action) => {
      state.isPostsByTime = action.payload;
    })
    .addCase(setCurrentThemes, (state, action) => {
      state.currentThemes = action.payload;
    })
    .addCase(setIsSystemThemes, (state, action) => {
      state.isSystemThemes = action.payload;
    })
    .addCase(saveLevelFilter, (state, action) => {
      state.levelFilter = action.payload;
    })
    .addCase(saveMinimumDanaFilter, (state, action) => {
      state.minimumDanaFilter = action.payload;
    })
    .addCase(setNegativeDanaStatus, (state, action) => {
      state.negativeDana = action.payload;
    })
    .addCase(changeCurrentLocale, (state, action) => {
      state.locale = action.payload;
    })
    .addCase(saveOfferFilterConfig, (state, action) => {
      state.offerFilterConfig = action.payload;
    })
    .addCase(updateTimeBackup, (state, action) => {
      state.timeBackupSeed = action.payload;
    });
});
