import { PayloadAction } from '@reduxjs/toolkit';
import { showToast } from '@store/toast/actions';
import intl from 'react-intl-universal';
import { all, fork, put, takeLatest } from 'redux-saga/effects';

import { sendCoinFailure, sendCoinSuccess } from './actions';
import { COIN } from '@bcpros/lixi-models';

function* sendCoinSuccessSaga(action: PayloadAction<{ amount: number; coin: COIN }>) {
  const { amount, coin } = action.payload;
  yield put(
    showToast('success', {
      message: 'Success',
      description: `Send ${amount.toFixed(2)} ${coin} successfully`,
      duration: 5
    })
  );
}

function* sendCoinFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('send.unableToSend');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 6
    })
  );
}

function* watchSendCoinSuccessSaga() {
  yield takeLatest(sendCoinSuccess.type, sendCoinSuccessSaga);
}

function* watchSendCoinFailureSaga() {
  yield takeLatest(sendCoinFailure.type, sendCoinFailureSaga);
}

export default function* sendSaga() {
  yield all([fork(watchSendCoinSuccessSaga), fork(watchSendCoinFailureSaga)]);
}
