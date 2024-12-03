import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { callConfig } from '../../context/index';
import { all, call, fork, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';

import { activateWallet, activateWalletFailure, activateWalletSuccess, setWalletHasUpdated } from './actions';
import { WalletPathAddressInfo } from '@bcpros/lixi-models/lib/wallet/wallet.model';

function* activateWalletSaga(action: PayloadAction<{ mnemonic: string; coin: COIN }>) {
  try {
    let Wallet;
    const { mnemonic, coin } = action.payload;
    let walletPaths: WalletPathAddressInfo[];
    let defaultPath: string;

    switch (coin) {
      case COIN.XPI:
        Wallet = callConfig.call.walletContext;
        defaultPath = "m/44'/10605'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
      case COIN.XEC:
        Wallet = callConfig.call.walletContextNode;
        defaultPath = "m/44'/1899'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
      case COIN.XRG:
        Wallet = callConfig.call.walletContext;
        defaultPath = "m/44'/2137'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
      default:
        Wallet = callConfig.call.walletContext;
        defaultPath = "m/44'/10605'/0'/0/0";
        walletPaths = yield call(Wallet.getWalletPathDetails, mnemonic, [defaultPath]);
        break;
    }

    console.log('🚀 ~ function*activateWalletSaga ~ walletPaths:', walletPaths);
    console.log('🚀 ~ function*activateWalletSaga ~ mnemonic:', mnemonic);
    console.log('🚀 ~ function*activateWalletSaga ~ walletPaths[0].xAddress:', walletPaths[0].xAddress);

    yield put(setWalletHasUpdated(false));
    yield put(
      activateWalletSuccess({
        walletPaths,
        mnemonic,
        selectPath: walletPaths[0].xAddress
      })
    );
  } catch (err) {
    console.log('🚀 ~ activateWalletSaga ~ err:', err);
    yield put(activateWalletFailure(JSON.stringify(err)));
  }
}

function* watchActivateWalletSaga() {
  yield takeLatest(activateWallet.type, activateWalletSaga);
}

export function* walletSaga() {
  yield all([fork(watchActivateWalletSaga)]);
}
