import { all, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { showToast } from '@store/toast/actions';
import intl from 'react-intl-universal';
import * as Effects from 'redux-saga/effects';

import { getPaymenMethods, getPaymenMethodsFailure, getPaymenMethodsSuccess } from './action';
import { paymentMethodApi } from '.';

const call: any = Effects.call;

function* getPaymenMethodsSaga(action: PayloadAction) {
  try {
    const promise = yield put(paymentMethodApi.api.endpoints.AllPaymenMethod.initiate());
    const data = yield promise;
    yield put(getPaymenMethodsSuccess(data?.data?.allPaymenMethod));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('country.unablegetPaymentMethod');
    yield put(getPaymenMethodsFailure(message));
  }
}

function* getPaymenMethodsFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('country.unablegetPaymentMethod');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
}

function* watchgetPaymentMethods() {
  yield takeLatest(getPaymenMethods.type, getPaymenMethodsSaga);
}

function* watchgetPaymentMethodsFailure() {
  yield takeLatest(getPaymenMethodsFailure.type, getPaymenMethodsFailureSaga);
}

export function* paymentMethodsSaga() {
  yield all([fork(watchgetPaymentMethods), fork(watchgetPaymentMethodsFailure)]);
}
