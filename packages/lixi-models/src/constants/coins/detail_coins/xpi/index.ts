import { CoinInfo } from '../typeCoinInfo';

export const infoXpi: CoinInfo = {
  name: 'Lotus',
  ticker: 'XPI',
  logo: '/images/currencies/xpi.svg',
  prefixes: ['lotus'],
  legacyPrefix: 'bitcoincash',
  coingeckoId: 'lotus',
  defaultFee: 2.01,
  dustSats: 550,
  etokenSats: 546,
  cashDecimals: 6,
  burnFee: 0.04,
  tokenName: 'lToken',
  tokenTicker: 'lToken',
  tokenPrefixes: ['ltoken'],
  blockExplorerUrl: 'https://explorer.givelotus.org',
  opReturn: {
    opReturnPrefixHex: '6a',
    opReturnAppPrefixLengthHex: '04',
    opPushDataOne: '4c',
    appPrefixesHex: {
      eToken: '534c5000',
      lotusChat: '02020202',
      lotusChatEncrypted: '03030303'
    },
    encryptedMsgByteLimit: 206,
    unencryptedMsgByteLimit: 215
  }
};
