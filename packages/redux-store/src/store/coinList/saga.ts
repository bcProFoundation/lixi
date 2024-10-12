import { all, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { showToast } from '@store/toast/actions';
import intl from 'react-intl-universal';

import { getCoinList, getCoinListFailure, getCoinListSuccess } from './action';
import { coinListApi } from '.';

function* getCoinListSaga(action: PayloadAction) {
  try {
    const promise = yield put(coinListApi.api.endpoints.AllCoinList.initiate());
    const data = yield promise;
    yield put(getCoinListSuccess(data?.data?.allCoinList));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('escrow.unablegetCoinList');
    yield put(getCoinListFailure(message));
  }
}

function* getCoinListFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('escrow.unablegetCoinList');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
}

function* watchGetCoinList() {
  yield takeLatest(getCoinList.type, getCoinListSaga);
}

function* watchGetCoinListFailure() {
  yield takeLatest(getCoinListFailure.type, getCoinListFailureSaga);
}

export function* coinListSaga() {
  yield all([fork(watchGetCoinList), fork(watchGetCoinListFailure)]);
}
