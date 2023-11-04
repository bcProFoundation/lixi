export interface Hash160AndAddress {
  address: string;
  hash160: string;
}

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
