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
  userSubcribeToAddressChannel,
  userSubcribeToPageMessageSession
} from './actions';
import { api as messageApi } from './message.api';
import { Message, MessageOrderField, OrderDirection, PageMessageSession } from '@generated/types.generated';
import { put as putAction } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { api as pageMessageApi } from './pageMessageSession.api';
import _ from 'lodash';
import { setPageMessageSession } from '@store/page/action';
import { SessionAction, SessionActionEnum } from '@bcpros/lixi-models/lib/sessionAction';
import { AccountDto } from '@bcpros/lixi-models';
import { getAccountById, getSelectedAccount } from '@store/account/selectors';
import { callConfig } from '@context/shareContext';

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

function createAddressSocketChannel(socket: Socket) {
  return eventChannel(emit => {
    const handler = (data: string) => {
      emit(data);
    };
    socket.on('publishAddressChannel', handler);
    return () => {
      socket.off('publishAddressChannel', handler);
    };
  });
}

function createSessionActionSocketChannel(socket: Socket) {
  return eventChannel(emit => {
    const handler = (data: string) => {
      emit(data);
    };
    socket.on('sessionAction', handler);
    return () => {
      socket.off('sessionAction', handler);
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
    const socketAddressChannel = yield call(createAddressSocketChannel, socket);
    const sessionActionSocketChannel = yield call(createSessionActionSocketChannel, socket);
    yield fork(listenDisconnectSaga);
    yield fork(listenConnectSaga);

    while (true) {
      const { message, payload, sessionAction } = yield race({
        message: take(socketMessageChannel),
        payload: take(socketAddressChannel),
        sessionAction: take(sessionActionSocketChannel)
      });

      if (message) {
        yield receiveLiveMessage(message);
      }

      if (payload) {
        yield receiveNewMessage(payload);
      }

      if (sessionAction) {
        console.log('🚀 ~ file: saga.ts:172 ~ function*listenServerSaga ~ sessionAction:', sessionAction);
        yield receiveSessionAction(sessionAction);
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
  const { pageMessageSessionId, body } = payload;
  const account: AccountDto = yield select(getSelectedAccount);

  try {
    yield putAction(
      messageApi.util.updateQueryData('MessageByPageMessageSessionId', { id: pageMessageSessionId }, draft => {
        draft.allMessageByPageMessageSessionId.edges.unshift({
          cursor: payload.id,
          node: {
            ...payload
          }
        });
        draft.allMessageByPageMessageSessionId.totalCount = draft.allMessageByPageMessageSessionId.totalCount + 1;
      })
    );
    yield putAction(
      pageMessageApi.util.updateQueryData('PageMessageSessionByAccountId', { id: account.id }, draft => {
        const index = draft.allPageMessageSessionByAccountId.edges.findIndex(
          edge => edge.node.id === pageMessageSessionId
        );

        const object = draft.allPageMessageSessionByAccountId.edges.find(edge => edge.node.id === pageMessageSessionId);

        if (index > -1) {
          draft.allPageMessageSessionByAccountId.edges.splice(index, 1);
          draft.allPageMessageSessionByAccountId.edges.unshift({
            cursor: object.cursor,
            node: {
              ...object.node,
              latestMessage: body
            }
          });
        }
      })
    );
  } catch (error) {
    console.log('error', error.message);
  }
}

function* receiveNewMessage(payload: PageMessageSession) {
  console.log(payload);
  const { id, page } = payload;
  const account: AccountDto = yield select(getSelectedAccount);

  try {
    yield putAction(
      pageMessageApi.util.updateQueryData('PageMessageSessionByAccountId', { id: account.id }, draft => {
        draft.allPageMessageSessionByAccountId.edges.unshift({
          cursor: id,
          node: {
            ...payload
          }
        });
        draft.allPageMessageSessionByAccountId.totalCount = draft.allPageMessageSessionByAccountId.totalCount + 1;
      })
    );
  } catch (error) {
    console.log('error', error.message);
  }
}

function* receiveSessionAction(action: SessionAction) {
  console.log(action);
  const { payload, type }: { payload: PageMessageSession; type: SessionActionEnum } = action;
  const pageAccount: AccountDto = yield select(getAccountById(payload.page.pageAccountId));
  const account: AccountDto = yield select(getSelectedAccount);

  switch (type) {
    case SessionActionEnum.OPEN:
      try {
        yield put(setPageMessageSession(payload));
        yield putAction(
          pageMessageApi.util.updateQueryData('PageMessageSessionByAccountId', { id: account.id }, draft => {
            const index = draft.allPageMessageSessionByAccountId.edges.findIndex(edge => edge.node.id === payload.id);

            const object = draft.allPageMessageSessionByAccountId.edges.find(edge => edge.node.id === payload.id);

            if (index > -1) {
              draft.allPageMessageSessionByAccountId.edges.splice(index, 1);
            }
            draft.allPageMessageSessionByAccountId.edges.unshift({
              cursor: object.cursor,
              node: {
                ...object.node
              }
            });
          })
        );
      } catch (error) {
        console.log('error', error.message);
      }
      break;
    case SessionActionEnum.CLOSE:
      try {
        yield put(setPageMessageSession(payload));
        yield putAction(
          pageMessageApi.util.updateQueryData('PageMessageSessionByAccountId', { id: account.id }, draft => {
            const index = draft.allPageMessageSessionByAccountId.edges.findIndex(edge => edge.node.id === payload.id);
            if (index > -1) {
              draft.allPageMessageSessionByAccountId.edges.splice(index, 1);
            }
          })
        );
      } catch (error) {
        console.log('error', error.message);
      }
      break;
  }
}

function* userSubcribeToPageMessageSessionSaga(action: PayloadAction<string>) {
  const { payload } = action;
  const socket = callConfig.call.socketContext;
  socket.emit('subscribePageMessageSession', payload);
}

function* pageOwnerSubcribeToPageChannelSaga(action: PayloadAction<string>) {
  const { payload } = action;
  const socket = callConfig.call.socketContext;
  socket.emit('subscribePageChannel', payload);
}

function* userSubcribeToAddressChannelSaga(action: PayloadAction<string>) {
  const { payload } = action;
  const socket = callConfig.call.socketContext;
  socket.emit('subscribeAddressChannel', payload);
}

function* watchUserSubcribeToPageMessageSession() {
  yield takeLatest(userSubcribeToPageMessageSession.type, userSubcribeToPageMessageSessionSaga);
}

function* watchPageOwnerSubcribeToPageChannel() {
  yield takeLatest(pageOwnerSubcribeToPageChannel.type, pageOwnerSubcribeToPageChannelSaga);
}

function* watchUserSubcribeToAddressChannel() {
  yield takeLatest(userSubcribeToAddressChannel.type, userSubcribeToAddressChannelSaga);
}

export default function* messageSaga() {
  if (typeof window === 'undefined') {
    yield all([]);
  } else {
    yield all([
      fork(startStopChannel),
      fork(watchUserSubcribeToPageMessageSession),
      fork(watchPageOwnerSubcribeToPageChannel),
      fork(watchUserSubcribeToAddressChannel)
    ]);
  }
}
