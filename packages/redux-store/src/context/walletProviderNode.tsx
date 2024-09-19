import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import BCHJS from '@bcpros/xpi-js';
import { useWalletNode } from '../hooks/useWalletNode';
import { WalletPathAddressInfo } from '@store/wallet';
import { ChronikClientNode, Utxo_InNode } from 'chronik-client';
import { createContext } from 'react';

export type WalletContextNodeValue = {
  XPI: BCHJS;
  chronik: ChronikClientNode;
  getWalletPathDetails: (mnemonic: string, paths: string[]) => Promise<WalletPathAddressInfo[]>;
  validateMnemonic: (mnemonic: string) => boolean;
  getUtxosByCoin: (coin: COIN) => Promise<{
    chronikUtxos: (Utxo_InNode & { address: string })[];
    nonSlpUtxos: (Utxo_InNode & { address: string })[];
  }>;
  getXecWalletPublicKey: (mnemonic: string) => Promise<string>;
};

export const WalletContextNode = createContext<WalletContextNodeValue | null>(null);

export const WalletProviderNode = ({ children }) => {
  const wallet = useWalletNode();

  return <WalletContextNode.Provider value={wallet}>{children}</WalletContextNode.Provider>;
};
