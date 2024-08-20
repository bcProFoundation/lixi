import { AccountDto as Account } from '@bcpros/lixi-models/lib/account/account.dto';
import { OrderDirection, WorshipOrderField } from '../../generated/types.generated';
import { getSelectedAccount } from '@store/account/selectors';
import { isMobile } from 'react-device-detect';
import { eventChannel } from 'redux-saga';
import { all, call, cancelled, delay, fork, put, put as putAction, race, select, take } from 'redux-saga/effects';
import io, { Socket } from 'socket.io-client';
import { channelOff, channelOn, serverOff, serverOn, startChannel, stopChannel } from './actions';
import { api as worshipApi } from './worshipedPerson.api';

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
const baseUrl = process.env.NEXT_PUBLIC_LIXI_API ? process.env.NEXT_PUBLIC_LIXI_API : 'https://lixi.social';
const socketServerUrl = `${baseUrl}/ws/worship`;

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

function subscribe(account: Account) {
  socket.emit('subscribe', account.mnemonicHash);
}

function createSocketChannel(socket: Socket) {
  return eventChannel(emit => {
    const handler = (data: Notification) => {
      emit(data);
    };
    socket.on('publishWorship', handler);
    return () => {
      socket.off('publishWorship', handler);
    };
  });
}

function* listenConnectSaga() {
  while (true) {
    yield call(reconnect);
    const account: Account = yield call(waitFor, getSelectedAccount);
    yield call(subscribe, account);
    yield put(serverOn());
  }
}

function* listenDisconnectSaga() {
  while (true) {
    yield call(disconnect);
    yield put(serverOn());
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

    const socketChannel = yield call(createSocketChannel, socket);
    yield fork(listenDisconnectSaga);
    yield fork(listenConnectSaga);

    const account: Account = yield call(waitFor, getSelectedAccount);
    yield call(subscribe, account);
    yield put(serverOn());

    while (true) {
      const payload = yield take(socketChannel);
      yield receiveLiveWorship(payload);
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

function* receiveLiveWorship(payload) {
  try {
    const params = {
      orderBy: {
        direction: OrderDirection.Desc,
        field: WorshipOrderField.UpdatedAt
      }
    };
    yield putAction(
      worshipApi.util.updateQueryData('allWorship', params, draft => {
        draft.allWorship.edges.unshift({
          cursor: payload.id,
          node: {
            ...payload
          }
        });
        draft.allWorship.totalCount = draft.allWorship.totalCount + 1;
      })
    );
  } catch (error) {
    console.log('error', error.message);
  }
}

export function* worshipSaga() {
  if (typeof window === 'undefined') {
    yield all([]);
  } else {
    yield all([fork(startStopChannel)]);
  }
}
