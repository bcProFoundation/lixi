export const FIAT_RATE_REDIS_PREFIX = 'fiat';

export const FIAT_RATE_REDIS_KEYS = {
  cmcQuote: (coin: string, fiat: string) => `${FIAT_RATE_REDIS_PREFIX}:cmc:${coin.toUpperCase()}:${fiat.toUpperCase()}`,
  oerLatest: `${FIAT_RATE_REDIS_PREFIX}:oer:latest`,
  merged: `${FIAT_RATE_REDIS_PREFIX}:merged:v1`
};

export const DEFAULT_CMC_COIN_IDS: Record<string, number> = {
  BTC: 1,
  LTC: 2,
  XRP: 52,
  DOGE: 74,
  BCH: 1831,
  ETH: 1027,
  USDT: 825,
  USDC: 3408,
  XEC: 10791
};

export const DEFAULT_CMC_COINS = ['XEC', 'BTC', 'BCH', 'ETH', 'DOGE', 'XRP', 'LTC', 'USDT', 'USDC'];

export const DEFAULT_HOT_FIATS = ['USD', 'EUR', 'VND', 'IDR', 'NGN', 'PHP', 'BRL', 'INR'];

export const DEFAULT_WARM_FIATS = [
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'KRW',
  'MXN',
  'THB',
  'MYR',
  'ZAR',
  'TRY',
  'UAH',
  'SGD',
  'HKD',
  'AED'
];

export const DEFAULT_MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];

export const DEFAULT_CMC_API_URL = 'https://pro-api.coinmarketcap.com';
export const DEFAULT_OER_API_URL = 'https://openexchangerates.org/api';

export const DEFAULT_TTL = {
  hotSeconds: 600,
  warmSeconds: 7200,
  mergedSeconds: 300,
  oerSeconds: 3600
};
