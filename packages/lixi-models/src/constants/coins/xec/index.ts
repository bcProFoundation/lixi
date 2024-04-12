import { CoinInfo } from '../typeCoinInfo';

export const infoXec: CoinInfo = {
  name: 'eCash',
  ticker: 'XEC',
  logo: '/images/currencies/xec.svg',
  legacyPrefix: 'bitcoincash',
  coingeckoId: 'ecash',
  defaultFee: 2.01,
  dustSats: 550,
  etokenSats: 546,
  cashDecimals: 2,
  burnFee: 0,
  tokenName: 'eToken',
  tokenTicker: 'eToken',
  prefixes: ['ecash'],
  tokenPrefixes: ['etoken'],
  blockExplorerUrl: 'https://explorer.e.cash'
};
