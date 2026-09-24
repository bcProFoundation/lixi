import { AllFiatRates } from '@bcpros/lixi-models';
import { FiatRateProviderConfig, MergedRateEntry } from './fiat-rate.types';
import {
  DEFAULT_CMC_API_URL,
  DEFAULT_CMC_COIN_IDS,
  DEFAULT_CMC_COINS,
  DEFAULT_HOT_FIATS,
  DEFAULT_OER_API_URL,
  DEFAULT_TTL,
  DEFAULT_WARM_FIATS
} from './fiat-rate.constants';

export function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return [...fallback];
  const parsed = value
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseCoinIds(value: string | undefined): Record<string, number> {
  const result: Record<string, number> = { ...DEFAULT_CMC_COIN_IDS };
  if (!value) return result;
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(entry => {
      const [symbol, id] = entry.split(':').map(part => part.trim());
      const numericId = id ? parseInt(id, 10) : NaN;
      if (symbol && Number.isFinite(numericId) && numericId > 0) {
        result[symbol.toUpperCase()] = numericId;
      }
    });
  return result;
}

export function readFiatRateConfig(get: (key: string) => string | undefined): FiatRateProviderConfig {
  return {
    provider: (get('FIAT_RATE_PROVIDER') || 'cmc-oer').toLowerCase(),
    cmcApiKey: get('CMC_API_KEY') || undefined,
    cmcApiUrl: get('CMC_API_URL') || DEFAULT_CMC_API_URL,
    cmcCoins: parseCsv(get('CMC_COINS'), DEFAULT_CMC_COINS),
    cmcCoinIds: parseCoinIds(get('CMC_COIN_IDS')),
    cmcConvertLimit: parsePositiveInt(get('CMC_CONVERT_LIMIT'), 1),
    hotFiats: parseCsv(get('FIAT_RATE_HOT_FIATS'), DEFAULT_HOT_FIATS),
    warmFiats: parseCsv(get('FIAT_RATE_WARM_FIATS'), DEFAULT_WARM_FIATS),
    hotTtlSeconds: parsePositiveInt(get('FIAT_RATE_HOT_TTL'), DEFAULT_TTL.hotSeconds),
    warmTtlSeconds: parsePositiveInt(get('FIAT_RATE_WARM_TTL'), DEFAULT_TTL.warmSeconds),
    mergedTtlSeconds: parsePositiveInt(get('FIAT_RATE_MERGED_TTL'), DEFAULT_TTL.mergedSeconds),
    oerAppId: get('OER_APP_ID') || undefined,
    oerApiUrl: get('OER_API_URL') || DEFAULT_OER_API_URL,
    oerTtlSeconds: parsePositiveInt(get('OER_TTL'), DEFAULT_TTL.oerSeconds),
    legacyFallbackEnabled: (get('FIAT_RATE_LEGACY_FALLBACK_ENABLED') || 'true').toLowerCase() !== 'false'
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunkSize = size > 0 ? size : 1;
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

export function toUnixSeconds(value?: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

export function derivePrice(cryptoUsd: number | undefined, usdToFiat: number | undefined): number | null {
  if (!cryptoUsd || cryptoUsd <= 0 || !usdToFiat || usdToFiat <= 0) return null;
  const price = cryptoUsd * usdToFiat;
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function mergeCryptoFiatRates(args: {
  fiats: string[];
  coins: string[];
  direct: Map<string, Map<string, number>>;
  directTs: Map<string, Map<string, number>>;
  cryptoUsd: Map<string, number>;
  forex: Map<string, number>;
  ts: number;
}): { fiatGrouped: AllFiatRates[]; cryptoGrouped: AllFiatRates[] } {
  const { fiats, coins, direct, directTs, cryptoUsd, forex, ts } = args;
  const fiatGrouped: AllFiatRates[] = [];
  const cryptoRatesByCoin = new Map<string, MergedRateEntry[]>();

  coins.forEach(coin => cryptoRatesByCoin.set(coin.toUpperCase(), []));

  fiats.forEach(fiatRaw => {
    const fiat = fiatRaw.toUpperCase();
    const entries: MergedRateEntry[] = [];

    coins.forEach(coinRaw => {
      const coin = coinRaw.toUpperCase();
      const directPrice = direct.get(coin)?.get(fiat);
      if (directPrice && directPrice > 0) {
        const entry: MergedRateEntry = {
          coin,
          ts: directTs.get(coin)?.get(fiat) || ts,
          rate: directPrice,
          source: 'cmc-direct'
        };
        entries.push(entry);
        cryptoRatesByCoin.get(coin)?.push({ coin: fiat, ts: entry.ts, rate: entry.rate, source: 'cmc-direct' });
        return;
      }

      const derived = derivePrice(cryptoUsd.get(coin), forex.get(fiat));
      if (derived) {
        entries.push({ coin, ts, rate: derived, source: 'derived' });
        cryptoRatesByCoin.get(coin)?.push({ coin: fiat, ts, rate: derived, source: 'derived' });
      }
    });

    if (entries.length > 0) {
      fiatGrouped.push({
        currency: fiat,
        fiatRates: entries.map(({ coin, ts: entryTs, rate }) => ({ coin, ts: entryTs, rate }))
      });
    }
  });

  const cryptoGrouped: AllFiatRates[] = [];
  cryptoRatesByCoin.forEach((rates, coin) => {
    if (rates.length > 0) {
      cryptoGrouped.push({
        currency: coin,
        fiatRates: rates.map(({ coin, ts: entryTs, rate }) => ({ coin, ts: entryTs, rate }))
      });
    }
  });

  return { fiatGrouped, cryptoGrouped };
}
