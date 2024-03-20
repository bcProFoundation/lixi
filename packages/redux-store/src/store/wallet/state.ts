import { EntityState } from '@reduxjs/toolkit';

import { WalletPathAddressInfo, WalletStatus } from './models';
export type WalletState = EntityState<WalletPathAddressInfo> & {
  selectedWalletPath?: Nullable<string>;
  walletStatus?: WalletStatus;
  mnemonic: string;
  walletRefreshInterval: number;
  walletHasUpdated: boolean;
}
