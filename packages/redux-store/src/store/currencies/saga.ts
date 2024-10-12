import { all, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { showToast } from '@store/toast/actions';
import intl from 'react-intl-universal';

import { getCurrencies, getCurrenciesFailure, getCurrenciesSuccess } from './action';
import { currenciesApi } from '.';

function* getCurrenciesSaga(action: PayloadAction) {
  try {
    const promise = yield put(currenciesApi.api.endpoints.AllCurrencies.initiate());
    const data = yield promise;
    yield put(getCurrenciesSuccess(data?.data?.allCurrencies));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('escrow.unablegetCurrencies');
    yield put(getCurrenciesFailure(message));
  }
}

function* getCurrenciesFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('escrow.unablegetCurrencies');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
}

function* watchGetCurrencies() {
  yield takeLatest(getCurrencies.type, getCurrenciesSaga);
}

function* watchGetCurrenciesFailure() {
  yield takeLatest(getCurrenciesFailure.type, getCurrenciesFailureSaga);
}

export function* currenciesSaga() {
  yield all([fork(watchGetCurrencies), fork(watchGetCurrenciesFailure)]);
}
