import { all, call, cancelled, fork, put, select, take, takeLatest } from '@redux-saga/core/effects';
import { isMobile } from 'react-device-detect';
import { eventChannel } from 'redux-saga';
import { delay, race } from 'redux-saga/effects';
import io, { Socket } from 'socket.io-client';
import {
  channelOff,
  channelOn,
  pageOwnerSubcribeToPageChannel,
  serverOff,
  serverOn,
  startChannel,
  stopChannel,
  userSubcribeToMessageSession
} from './actions';
import { api as messageApi } from './message.api';
import { Message, MessageOrderField, OrderDirection, PageMessageSession } from '@generated/types.generated';
import { put as putAction } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { api as pageMessageApi } from './pageMessageSession.api';

const getDeviceNotificationStyle = () => {
  if (isMobile) {
    const notificationStyle = {
      width: '100%',
      marginTop: '10%'
    };
    return notificationStyle;
  }
  if (!isMobile) {
    const notificationStyle = {
      width: '100%'
    };
    return notificationStyle;
  }
};

let socket: Socket;
const baseUrl = process.env.NEXT_PUBLIC_LIXI_API ? process.env.NEXT_PUBLIC_LIXI_API : 'https://lixilotus.com/';
const socketServerUrl = `${baseUrl}ws/message`;

/**
 * Wait for the selector until the value existed
 * https://goshacmd.com/detect-state-change-redux-saga/
 * @param selector The selector
 * @returns Finish the generator
 */
function* waitFor(selector) {
  const data = yield select(selector);
  if (data) return data;

  while (true) {
    yield take('*'); // (1a)
    const data = yield select(selector);
    if (data) return data; // (1b)
  }
}

function connect(): Promise<Socket> {
  socket = io(socketServerUrl, { transports: ['websocket'] });
  return new Promise(resolve => {
    socket.on('connect', () => {
      resolve(socket);
    });
  });
}

function disconnect() {
  return new Promise(resolve => {
    socket.on('disconnect', () => {
      resolve(socket);
    });
  });
}

function reconnect(): Promise<Socket> {
  return new Promise(resolve => {
    socket.io.on('reconnect', () => {
      resolve(socket);
    });
  });
}

function createMessageSocketChannel(socket: Socket) {
  return eventChannel(emit => {
    const handler = (data: string) => {
      emit(data);
    };
    socket.on('publishMessage', handler);
    return () => {
      socket.off('publishMessage', handler);
    };
  });
}

function createPageSocketChannel(socket: Socket) {
  return eventChannel(emit => {
    const handler = (data: string) => {
      emit(data);
    };
    socket.on('publishPageChannel', handler);
    return () => {
      socket.off('publishPageChannel', handler);
    };
  });
}

function* listenConnectSaga() {
  while (true) {
    yield call(reconnect);
    yield put(serverOn());
  }
}

function* listenDisconnectSaga() {
  while (true) {
    yield call(disconnect);
    yield put(serverOff());
  }
}

function* listenServerSaga() {
  try {
    yield put(channelOn());
    const { timeout } = yield race({
      connected: yield call(connect),
      timeout: yield delay(2000)
    });
    if (timeout) {
      yield put(serverOff());
    }

    const socketMessageChannel = yield call(createMessageSocketChannel, socket);
    const socketPageChannel = yield call(createPageSocketChannel, socket);
    yield fork(listenDisconnectSaga);
    yield fork(listenConnectSaga);

    while (true) {
      const { message, payload } = yield race({
        message: take(socketMessageChannel),
        payload: take(socketPageChannel)
      });

      if (message) {
        yield receiveLiveMessage(message);
      }

      if (payload) {
        yield receiveNewMessage(payload);
      }
    }
  } catch (error) {
    console.log('error', error.message);
  } finally {
    if (yield cancelled()) {
      if (socket) {
        socket.disconnect();
      }
      yield put(channelOff());
    }
  }
}

function* startStopChannel() {
  while (true) {
    yield take(startChannel.type);
    yield race([yield call(listenServerSaga), yield take(stopChannel.type)]);
  }
}

function* receiveLiveMessage(payload: any) {
  console.log(payload);
  const { id, messageSessionId, pageMessageSessionId } = payload;
  try {
    yield putAction(
      messageApi.util.updateQueryData('MessageByMessageSessionId', { id: messageSessionId }, draft => {
        draft.allMessageByMessageSessionId.edges.unshift({
          cursor: payload.id,
          node: {
            ...payload
          }
        });
        draft.allMessageByMessageSessionId.totalCount = draft.allMessageByMessageSessionId.totalCount + 1;
      })
    );
  } catch (error) {
    console.log('error', error.message);
  }
}

function* receiveNewMessage(payload: PageMessageSession) {
  console.log(payload);
  const { id, account, page } = payload;
  try {
    yield putAction(
      pageMessageApi.util.updateQueryData('PageMessageSessionByPageId', { id: page.id }, draft => {
        draft.allPageMessageSessionByPageId.edges.unshift({
          cursor: id,
          node: {
            ...payload
          }
        });
        draft.allPageMessageSessionByPageId.totalCount = draft.allPageMessageSessionByPageId.totalCount + 1;
      })
    );
  } catch (error) {
    console.log('error', error.message);
  }
}

function* userSubcribeToMessageSessionSaga(action: PayloadAction<string>) {
  const { payload } = action;
  socket.emit('subscribeMessageSession', payload);
}

function* pageOwnerSubcribeToPageChannelSaga(action: PayloadAction<string>) {
  const { payload } = action;
  socket.emit('subscribePageChannel', payload);
}

function* watchUserSubcribeToMessageSession() {
  yield takeLatest(userSubcribeToMessageSession.type, userSubcribeToMessageSessionSaga);
}

function* watchPageOwnerSubcribeToPageChannel() {
  yield takeLatest(pageOwnerSubcribeToPageChannel.type, pageOwnerSubcribeToPageChannelSaga);
}

export default function* messageSaga() {
  if (typeof window === 'undefined') {
    yield all([]);
  } else {
    yield all([
      fork(startStopChannel),
      fork(watchUserSubcribeToMessageSession),
      fork(watchPageOwnerSubcribeToPageChannel)
    ]);
  }
}
