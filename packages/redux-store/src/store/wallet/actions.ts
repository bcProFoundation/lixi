import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { createAction } from '@reduxjs/toolkit';

import { WalletPathAddressInfo, WalletStatus } from './models';

export const writeWalletStatus = createAction<WalletStatus>('wallet/writeWalletStatus');
export const activateWallet = createAction<{ mnemonic: string; coin: COIN }>('wallet/activateWallet');
export const activateWalletSuccess = createAction<{
  walletPaths: WalletPathAddressInfo[];
  mnemonic: string;
  selectPath: string;
}>('wallet/activateWalletSuccess');
export const activateWalletFailure = createAction<string>('wallet/activateWalletFailure');
export const setWalletRefreshInterval = createAction<number>('wallet/setWalletRefreshInterval');
export const setWalletHasUpdated = createAction<boolean>('wallet/setWalletHasUpdated');
export const setWalletPaths = createAction<WalletPathAddressInfo[]>('wallet/setWalletPaths');
export const removeWalletPaths = createAction<string>('wallet/removeWalletPaths');
export const removeAllWallets = createAction<string>('wallet/removeAllWallets');
