export type FiatRateTier = 'hot' | 'warm' | 'cold';

export interface CryptoQuote {
  coin: string;
  fiat: string;
  price: number;
  ts: number;
  source: 'cmc-direct';
}

export interface ForexRates {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

export interface MergedRateEntry {
  coin: string;
  ts: number;
  rate: number;
  source: 'cmc-direct' | 'derived';
}

export interface FiatRateProviderConfig {
  provider: string;
  cmcApiKey?: string;
  cmcApiUrl: string;
  cmcCoins: string[];
  cmcCoinIds: Record<string, number>;
  cmcConvertLimit: number;
  hotFiats: string[];
  warmFiats: string[];
  hotTtlSeconds: number;
  warmTtlSeconds: number;
  mergedTtlSeconds: number;
  oerAppId?: string;
  oerApiUrl: string;
  oerTtlSeconds: number;
  legacyFallbackEnabled: boolean;
}

export interface CmcQuoteV1 {
  price?: number;
  last_updated?: string;
}

export interface CmcAssetV1 {
  id: number;
  name: string;
  symbol: string;
  quote?: Record<string, CmcQuoteV1>;
}

export interface CmcQuotesLatestV1Response {
  data?: Record<string, CmcAssetV1>;
  status?: { error_code?: number; error_message?: string };
}

export interface CmcQuoteV3 {
  symbol?: string;
  price?: number;
  last_updated?: string;
}

export interface CmcAssetV3 {
  id: number;
  name: string;
  symbol: string;
  quote?: CmcQuoteV3[] | Record<string, CmcQuoteV1>;
}

export interface CmcQuotesLatestV3Response {
  data?: CmcAssetV3[];
  status?: { error_code?: number; error_message?: string };
}
