import { all, fork, takeLatest } from 'redux-saga/effects';
import { userSubcribeEscrowOrderChannel } from './action';
import { PayloadAction } from '@reduxjs/toolkit';
import { callConfig } from '../../context/shareContext';

function* userSubcribeToEscrowOrderChannelSaga(action: PayloadAction<string>) {
  const { payload } = action;
  const { socket } = callConfig.call.socketContext;
  socket.emit('subscribeEscrowOrderChannel', payload);
}

function* watchUserSubcribeEscrowOrderChannel() {
  yield takeLatest(userSubcribeEscrowOrderChannel.type, userSubcribeToEscrowOrderChannelSaga);
}

export function* escrowSaga() {
  if (typeof window === 'undefined') {
    yield all([]);
  } else {
    yield all([fork(watchUserSubcribeEscrowOrderChannel)]);
  }
}
