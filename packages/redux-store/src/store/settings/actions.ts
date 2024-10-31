import { FilterBurnCommand } from '@bcpros/lixi-models/lib/filter';
import { SearchBoxCommand } from '@bcpros/lixi-models/lib/search';
import { createAction } from '@reduxjs/toolkit';

import { WebAuthnConfig, WebPushNotifConfig } from './model';
import { OfferFilterInput } from '@bcpros/lixi-models/lib/escrow/inputs/offer-filter.input';

export const toggleCollapsedSideNav = createAction<boolean>('settings/toggleCollapsedSideNav');
export const updateLanguage = createAction<string>('settings/updateLanguage');
export const setInitIntlStatus = createAction<boolean>('settings/setInitIntlStatus');
export const setCurrentThemes = createAction<string>('settings/setCurrentThemes');

export const setIsSystemThemes = createAction<boolean>('settings/setIsSystemThemes');

export const loadLocale = createAction<string>('settings/loadLocale');
export const loadLocaleSuccess = createAction<string>('settings/loadLocaleSuccess');
export const loadLocaleFailure = createAction<string>('settings/loadLocaleFailure');
export const saveWebAuthnConfig = createAction<WebAuthnConfig>('settings/saveWebAuthnConfig');
export const saveBurnFilter = createAction<FilterBurnCommand>('settings/saveBurnFilter');
export const savePostsByTimeFilter = createAction<boolean>('settings/savePostsByTimeFilter');
export const saveWebPushNotifConfig = createAction<WebPushNotifConfig>('settings/saveWebPushNotifConfig');
export const saveAllowPushNotification = createAction<boolean>('settings/saveAllowPushNotification');
export const saveLevelFilter = createAction<number>('settings/saveLevelFilter');
export const saveMinimumDanaFilter = createAction<number>('settings/saveMinimumDanaFilter');
export const setNegativeDanaStatus = createAction<boolean>('settings/setNegativeDanaStatus');

export const changeCurrentLocale = createAction<string>('settings/changeCurrentLocale');

export const saveOfferFilterConfig = createAction<OfferFilterInput>('settings/saveOfferFilterConfig');
export const updateTimeBackup = createAction<string>('settings/updateTimeBackup');
