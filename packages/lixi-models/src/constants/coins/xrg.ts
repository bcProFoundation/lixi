import { CoinInfo } from './typeCoinInfo';

export const infoXrg: CoinInfo = {
  name: 'Ergon',
  ticker: 'μXRG',
  logo: '/images/currencies/xrg.png',
  background: '/images/currencies/bg-xrg.svg',
  legacyPrefix: 'bitcoincash',
  coingeckoId: 'ecash',
  defaultFee: 0.01,
  dustSats: 5,
  etokenSats: 5.46,
  cashDecimals: 8,
  microCashDecimals: 2,
  burnFee: 0.04,
  canBurn: true,
  tokenName: 'eToken',
  tokenTicker: 'eToken',
  prefixes: ['ecash'],
  tokenPrefixes: ['etoken'],
  blockExplorerUrl: 'https://explorer.ergon.network',
  blockTime: 600,
  totalBlockInDay: 144
};
