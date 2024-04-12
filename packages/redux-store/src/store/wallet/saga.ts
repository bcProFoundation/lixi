import { COIN } from '@bcpros/lixi-models/constants';
import { callConfig } from '@context/index';
import { all, call, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';

import { activateWallet, activateWalletFailure, activateWalletSuccess, setWalletHasUpdated } from './actions';
import { WalletPathAddressInfo } from '@bcpros/lixi-models';

function* activateWalletSaga(action: PayloadAction<{ mnemonic: string; coin: COIN }>) {
  try {
    const Wallet = callConfig.call.walletContext;
    const { mnemonic, coin } = action.payload;
    let walletPaths: WalletPathAddressInfo[];
    let defaultPath: string;

    switch (coin) {
      case COIN.XPI:
        defaultPath = "m/44'/10605'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
      case COIN.XEC:
        defaultPath = "m/44'/1899'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
      default:
        defaultPath = "m/44'/10605'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
    }

    yield put(setWalletHasUpdated(false));
    yield put(
      activateWalletSuccess({
        walletPaths,
        mnemonic,
        selectPath: walletPaths[0].xAddress
      })
    );
  } catch (err) {
    yield put(activateWalletFailure(JSON.stringify(err)));
  }
}

function* watchActivateWalletSaga() {
  yield takeLatest(activateWallet.type, activateWalletSaga);
}

export default function* walletSaga() {
  yield all([fork(watchActivateWalletSaga)]);
}
