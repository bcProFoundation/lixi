import { Utxo, Utxo_InNode } from 'chronik-client';

export interface WalletPathAddressInfo {
  path: string;
  cashAddress: string;
  fundingAddress: string;
  fundingWif: string;
  hash160: string;
  legacyAddress: string;
  publicKey: string;
  xAddress: string;
}

export interface SlpBalanceAndUtxos {
  nonSlpUtxos: Array<Utxo & { address: string }>;
  preliminarySlpUtxos: Array<Utxo & { address: string }>;
}

export interface SlpBalanceAndUtxosNode {
  nonSlpUtxos: Array<Utxo_InNode & { address: string }>;
  preliminarySlpUtxos: Array<Utxo_InNode & { address: string }>;
}

export interface WalletStatus {
  balances: {
    totalBalanceInSatoshis: string;
    totalBalance: string;
  };
  slpBalancesAndUtxos: SlpBalanceAndUtxos;
  utxos: Array<Utxo & { address: string }>;
}

export interface WalletStatusNode {
  balances: {
    totalBalanceInSatoshis: string;
    totalBalance: string;
  };
  slpBalancesAndUtxos: {
    nonSlpUtxos: Array<Utxo_InNode & { address: string }>;
    preliminarySlpUtxos: Array<Utxo_InNode & { address: string }>;
  };
  utxos: Array<Utxo_InNode & { address: string }>;
}
