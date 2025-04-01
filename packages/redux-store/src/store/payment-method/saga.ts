import { all, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { showToast } from '@store/toast/actions';
import intl from 'react-intl-universal';
import * as Effects from 'redux-saga/effects';

import { getPaymentMethods, getPaymentMethodsFailure, getPaymentMethodsSuccess } from './action';
import { paymentMethodApi } from '.';

const call: any = Effects.call;

function* getPaymentMethodsSaga(action: PayloadAction) {
  try {
    const promise = yield put(paymentMethodApi.api.endpoints.AllPaymenMethod.initiate());
    const data = yield promise;
    yield put(getPaymentMethodsSuccess(data?.data?.allPaymenMethod));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('country.unablegetPaymentMethod');
    yield put(getPaymentMethodsFailure(message));
  }
}

function* getPaymentMethodsFailureSaga(action: PayloadAction<string>) {
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
  yield takeLatest(getPaymentMethods.type, getPaymentMethodsSaga);
}

function* watchgetPaymentMethodsFailure() {
  yield takeLatest(getPaymentMethodsFailure.type, getPaymentMethodsFailureSaga);
}

export function* paymentMethodsSaga() {
  yield all([fork(watchgetPaymentMethods), fork(watchgetPaymentMethodsFailure)]);
}
