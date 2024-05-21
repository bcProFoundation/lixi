import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { routerReducer } from 'connected-next-router';
import { walletStateReducer } from './wallet';
import { accountReducer } from './account';
import { localUserAccountReducer } from './localAccount';
import { postReducer } from './post';
import { lixiReducer } from './lixi';
import { claimReducer } from './claim';
import { envelopeReducer } from './envelope';
import { loadingReducer } from './loading';
import { modalReducer } from './modal';
import { actionSheetReducer } from './action-sheet';
import { toastReducer } from './toast';
import { errorReducer } from './error';
import { settingsReducer } from './settings';
import { notificationReducer } from './notification';
import { pageReducer } from './page';
import { tokenReducer } from './token';
import { countryReducer, stateReducer } from './country';
import { categoryReducer } from './category';
import { burnReducer } from './burn';
import { messageReducer } from './message';
import { actionReducer } from './action';
import { api } from '../api/baseApi';

export * from './account';
export * from './burn';
export * from './category';
export * from './claim';
export * from './comment';
export * from './country';
export * from './envelope';
export * from './error';
export * from './lixi';
export * from './loading';
export * from './localAccount';
export * from './modal';
export * from './action';
export * from './action-sheet';
export * from './notification';
export * from './page';
export * from './persistor';
export * from './post';
export * from './send';
export * from './settings';
export * from './store';
export * from './toast';
export * from './token';
export * from './websocket';
export * from './wallet';
export * from './hooks';
export * from './rootReducer';
export * from './rootSaga';
export * from './message';
export * as worship from './worship';
export * as temple from './temple';
export * as hashtag from './hashtag';
export * as bookmark from './bookmark';

const configureLocalStore = () => {
  return configureStore({
    reducer: {
      router: routerReducer,
      wallet: walletStateReducer,
      accounts: accountReducer,
      localAccounts: localUserAccountReducer,
      posts: postReducer,
      lixies: lixiReducer,
      claims: claimReducer,
      envelopes: envelopeReducer,
      loading: loadingReducer,
      modal: modalReducer,
      actionSheet: actionSheetReducer,
      toast: toastReducer,
      error: errorReducer,
      settings: settingsReducer,
      notifications: notificationReducer,
      pages: pageReducer,
      tokens: tokenReducer,
      countries: countryReducer,
      states: stateReducer,
      categories: categoryReducer,
      burn: burnReducer,
      pageMessage: messageReducer,
      // This is use for useReduxEffect
      // Should be always at the end
      [api.reducerPath]: api.reducer,
      action: actionReducer
    }
  });
}

type LixiStoreInterface = ReturnType<typeof configureLocalStore>['getState'];

export let useSliceSelector: TypedUseSelectorHook<LixiStoreInterface> = useSelector;

type SliceDispatch = ReturnType<typeof configureLocalStore>['dispatch'];

export let useSliceDispatch = () => useDispatch<SliceDispatch>();

export const initializeSlicePackage = (
  useAppDispatch: typeof useSliceDispatch,
  useAppSelector: typeof useSliceSelector
) => {
  useSliceDispatch = useAppDispatch;
  useSliceSelector = useAppSelector;
}


