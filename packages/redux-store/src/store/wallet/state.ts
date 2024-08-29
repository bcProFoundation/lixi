import { EntityState } from '@reduxjs/toolkit';

import { WalletPathAddressInfo, WalletStatus, WalletStatusNode } from './models';
export interface WalletState extends EntityState<WalletPathAddressInfo, string> {
  selectedWalletPath?: Nullable<string>;
  walletStatus?: WalletStatus;
  walletStatusNode?: WalletStatusNode;
  mnemonic: string;
  walletRefreshInterval: number;
  walletHasUpdated: boolean;
}
