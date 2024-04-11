export type CoinInfo = {
  name: string;
  ticker: string;
  logo: string;
  prefixes: string[];
  legacyPrefix: string;
  coingeckoId: string;
  defaultFee: number;
  dustSats: number;
  etokenSats: number;
  cashDecimals: number;
  burnFee: number;
  tokenName: string;
  tokenTicker: string;
  tokenPrefixes: string[];
  blockExplorerUrl: string;
  opReturn?: any;
};
