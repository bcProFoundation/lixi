export const currency = {
  name: 'Lotus',
  ticker: 'XPI',
  logo: '/images/lotus_logo.png',
  legacyPrefix: 'bitcoincash',
  prefixes: ['lotus'],
  coingeckoId: 'bitcoin-cash-abc-2',
  defaultFee: 2.01,
  dustSats: 550,
  burnFee: 0.04,
  etokenSats: 546,
  cashDecimals: 6,
  blockExplorerUrl: 'https://explorer.givelotus.org',
  tokenExplorerUrl: 'https://explorer.be.cash',
  blockExplorerUrlTestnet: 'https://texplorer.bitcoinabc.org',
  tokenName: 'eToken',
  tokenTicker: 'eToken',
  tokenLogo: '/images/logo_secondary.png',
  tokenPrefixes: ['etoken'],
  tokenIconsUrl: 'https://etoken-icons.s3.us-west-2.amazonaws.com',
  txHistoryCount: 20,
  hydrateUtxoBatchSize: 20,
  defaultSettings: { fiatCurrency: 'usd' },
  notificationDurationShort: 3,
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
  },
  settingsValidation: {
    fiatCurrency: [
      'usd',
      'idr',
      'krw',
      'cny',
      'zar',
      'vnd',
      'cad',
      'nok',
      'eur',
      'gbp',
      'jpy',
      'try',
      'rub',
      'inr',
      'brl'
    ]
  },
  fiatCurrencies: {
    usd: { name: 'US Dollar', symbol: '$', slug: 'usd' },
    brl: { name: 'Brazilian Real', symbol: 'R$', slug: 'brl' },
    gbp: { name: 'British Pound', symbol: '£', slug: 'gbp' },
    cad: { name: 'Canadian Dollar', symbol: '$', slug: 'cad' },
    cny: { name: 'Chinese Yuan', symbol: '元', slug: 'cny' },
    eur: { name: 'Euro', symbol: '€', slug: 'eur' },
    inr: { name: 'Indian Rupee', symbol: '₹', slug: 'inr' },
    idr: { name: 'Indonesian Rupiah', symbol: 'Rp', slug: 'idr' },
    jpy: { name: 'Japanese Yen', symbol: '¥', slug: 'jpy' },
    krw: { name: 'Korean Won', symbol: '₩', slug: 'krw' },
    nok: { name: 'Norwegian Krone', symbol: 'kr', slug: 'nok' },
    rub: { name: 'Russian Ruble', symbol: 'р.', slug: 'rub' },
    zar: { name: 'South African Rand', symbol: 'R', slug: 'zar' },
    try: { name: 'Turkish Lira', symbol: '₺', slug: 'try' },
    vnd: { name: 'Vietnamese đồng', symbol: 'đ', slug: 'vnd' }
  }
};

// Default transaction parameters
export const TRANSACTION = {
  /** Default withdrawal fee, in satoshis */
  FEE: 100000,
  /** Default output dust limit */
  DUST_LIMIT: 546,
  /** Minimum output amount for any Give/Withdraw */
  MIN_OUTPUT_AMOUNT: 1000
};

export const oldEpoch = '2024-01-01 00:00:00';
export const newEpoch = '2025-01-01 00:00:00';
export const offer_half_life = 24 * 7; // 1 week
export const PAGE_SIZE = 20;

export const BOOST_AMOUNT = 100;
