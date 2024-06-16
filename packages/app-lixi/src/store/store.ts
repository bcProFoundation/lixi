import useXPI from '@hooks/useXPI';
import { Action, Store, configureStore } from '@reduxjs/toolkit';
import { UnknownAction } from 'redux';
import createSagaMiddleware, { Task } from 'redux-saga';
import { createRouterMiddleware, initialRouterState } from 'connected-next-router';
import { Context, createWrapper } from 'next-redux-wrapper';
import { Router } from 'next/router';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistStore } from 'redux-persist';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';

import { api } from '@store/index';
import rootReducer, { serverReducer } from './rootReducer';
import rootSaga from './rootSaga';
import { setupListeners } from '@reduxjs/toolkit/query';

export interface SagaStore extends Store {
  __sagaTask: Task;
}

const makeStore = (context: Context) => {
  const isServer = typeof window === 'undefined';

  const sagaMiddleware = createSagaMiddleware({
    onError: (error: Error, { sagaStack: string }) => {
      console.log(error);
    },
    context: {
      useXPI: useXPI
    }
  });

  const routerMiddleware = createRouterMiddleware();
  const { asPath } = (context as any).ctx || (Router as any).router || {};
  let initialState;
  if (asPath) {
    initialState = {
      router: initialRouterState(asPath)
    };
  }

  let store;

  if (isServer) {
    store = configureStore({
      reducer: serverReducer,
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(sagaMiddleware),
      devTools: false
    });
  } else {
    store = configureStore({
      reducer: rootReducer,
      middleware: getDefaultMiddleware => {
        return (
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
            }
          })
            // We only need one middleware for rtk query here
            // because all apis are splitted, but actually be enhanced from only 1 baseApi
            // If we concat multiple middleware here, each time there's an internal rtk query action
            // multiple instances of same action will be dispatched, caused onQueryStarted run multiple times.
            .concat(api.middleware)
            .concat(sagaMiddleware)
            .concat(routerMiddleware)
        );
      },
      devTools:
        process.env.NODE_ENV === 'production'
          ? false
          : {
            actionsDenylist: [
              'wallet/writeWalletStatus',
              'posts/setShowCreatePost',
              'analyticEvent/batchEvents',
              'analyticEvent/analyticEvent'
            ]
          },
      preloadedState: initialState
    });
    setupListeners(store.dispatch);

    (store as any).__persistor = persistStore(store);
  }

  (store as SagaStore).__sagaTask = sagaMiddleware.run(rootSaga);
  return store;
};

// Define utilities types for redux toolkit
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunkDispatch = ThunkDispatch<RootState, void, UnknownAction>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;

export const wrapper: any = createWrapper<AppStore>(makeStore, { debug: true });
