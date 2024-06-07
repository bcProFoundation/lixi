import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import BCHJS from '@bcpros/xpi-js';
import useWallet from '@hooks/useWallet';
import { WalletPathAddressInfo } from '@store/wallet';
import { ChronikClient, Utxo } from 'chronik-client';
import { createContext } from 'react';

export type WalletContextValue = {
  XPI: BCHJS;
  chronik: ChronikClient;
  getWalletPathDetails: (
    mnemonic: string,
    paths: string[],
  ) => Promise<WalletPathAddressInfo[]>;
  validateMnemonic: (mnemonic: string) => boolean;
  getUtxosByCoin: (coin: COIN) => Promise<{
    chronikUtxos: (Utxo & { address: string })[];
    nonSlpUtxos: (Utxo & { address: string })[];
  }>;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

export const WalletProvider = ({ children }) => {
  const wallet = useWallet();

  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
};
