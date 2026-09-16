import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Redis } from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { FIAT_RATE_REDIS_KEYS } from './fiat-rate.constants';
import {
  CmcAssetV3,
  CmcQuotesLatestV1Response,
  CmcQuotesLatestV3Response,
  CryptoQuote,
  FiatRateProviderConfig,
  FiatRateTier
} from './fiat-rate.types';
import { chunk, readFiatRateConfig, toUnixSeconds } from './fiat-rate.utils';

@Injectable()
export class CoinMarketCapProvider {
  private readonly logger = new Logger(CoinMarketCapProvider.name);
  private config: FiatRateProviderConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis
  ) {
    this.config = readFiatRateConfig(key => this.configService.get<string>(key));
  }

  isConfigured(): boolean {
    return Boolean(this.config.cmcApiKey);
  }

  getTier(fiat: string): FiatRateTier {
    const code = fiat.toUpperCase();
    if (this.config.hotFiats.includes(code)) return 'hot';
    if (this.config.warmFiats.includes(code)) return 'warm';
    return 'cold';
  }

  getTtlForFiat(fiat: string): number {
    const tier = this.getTier(fiat);
    if (tier === 'hot') return this.config.hotTtlSeconds;
    if (tier === 'warm') return this.config.warmTtlSeconds;
    return this.config.hotTtlSeconds;
  }

  async getUsdPrices(coins: string[]): Promise<Map<string, CryptoQuote>> {
    const quotes = await this.getQuotes(coins, ['USD']);
    const result = new Map<string, CryptoQuote>();
    quotes.forEach((byFiat, coin) => {
      const usd = byFiat.get('USD');
      if (usd) result.set(coin, usd);
    });
    return result;
  }

  async getQuotes(coins: string[], fiats: string[]): Promise<Map<string, Map<string, CryptoQuote>>> {
    const normalizedCoins = [...new Set(coins.map(coin => coin.toUpperCase()))].filter(Boolean);
    const normalizedFiats = [...new Set(fiats.map(fiat => fiat.toUpperCase()))].filter(Boolean);
    const result = new Map<string, Map<string, CryptoQuote>>();
    normalizedCoins.forEach(coin => result.set(coin, new Map<string, CryptoQuote>()));

    if (normalizedCoins.length === 0 || normalizedFiats.length === 0) return result;
    if (!this.isConfigured()) {
      throw new Error('CMC_API_KEY is not configured');
    }

    const missingByFiat = new Map<string, string[]>();
    for (const fiat of normalizedFiats) {
      const missingCoins: string[] = [];
      for (const coin of normalizedCoins) {
        const cached = await this.readCachedQuote(coin, fiat);
        if (cached) {
          result.get(coin)?.set(fiat, cached);
        } else {
          missingCoins.push(coin);
        }
      }
      if (missingCoins.length > 0) missingByFiat.set(fiat, missingCoins);
    }

    if (missingByFiat.size === 0) return result;

    const missingFiats = [...missingByFiat.keys()];
    const batches = chunk(missingFiats, Math.max(1, this.config.cmcConvertLimit));
    for (const batch of batches) {
      const batchCoins = [...new Set(batch.flatMap(fiat => missingByFiat.get(fiat) || []))];
      const fetched = await this.fetchQuotes(batchCoins, batch);
      fetched.forEach((byFiat, coin) => {
        byFiat.forEach((quote, fiat) => {
          result.get(coin)?.set(fiat, quote);
        });
      });
    }

    return result;
  }

  private async readCachedQuote(coin: string, fiat: string): Promise<CryptoQuote | null> {
    try {
      const raw = await this.redis.get(FIAT_RATE_REDIS_KEYS.cmcQuote(coin, fiat));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CryptoQuote;
      if (!parsed || !parsed.price || parsed.price <= 0) return null;
      return parsed;
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] CMC cache read failed for ${coin}/${fiat}: ${error?.message || error}`);
      return null;
    }
  }

  private async writeCachedQuote(quote: CryptoQuote): Promise<void> {
    try {
      const ttl = this.getTtlForFiat(quote.fiat);
      await this.redis.set(FIAT_RATE_REDIS_KEYS.cmcQuote(quote.coin, quote.fiat), JSON.stringify(quote), 'EX', ttl);
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] CMC cache write failed: ${error?.message || error}`);
    }
  }

  private resolveCoinIds(coins: string[]): { ids: number[]; idToSymbol: Map<number, string> } {
    const ids: number[] = [];
    const idToSymbol = new Map<number, string>();
    const missing: string[] = [];

    coins.forEach(coin => {
      const id = this.config.cmcCoinIds[coin.toUpperCase()];
      if (id) {
        ids.push(id);
        idToSymbol.set(id, coin.toUpperCase());
      } else {
        missing.push(coin);
      }
    });

    if (missing.length > 0) {
      this.logger.warn(`[Fiat Rate] Missing CMC coin IDs for: ${missing.join(', ')}`);
    }
    return { ids, idToSymbol };
  }

  private async fetchQuotes(coins: string[], converts: string[]): Promise<Map<string, Map<string, CryptoQuote>>> {
    const result = new Map<string, Map<string, CryptoQuote>>();
    coins.forEach(coin => result.set(coin.toUpperCase(), new Map<string, CryptoQuote>()));
    if (coins.length === 0 || converts.length === 0) return result;

    const { ids, idToSymbol } = this.resolveCoinIds(coins);
    if (ids.length === 0) return result;

    const headers = {
      'X-CMC_PRO_API_KEY': this.config.cmcApiKey as string,
      Accept: 'application/json'
    };

    const params = {
      id: ids.join(','),
      convert: converts.map(item => item.toUpperCase()).join(',')
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.config.cmcApiUrl}/v3/cryptocurrency/quotes/latest`, {
          headers,
          params,
          timeout: 10000
        })
      );
      this.parseV3Response(response?.data as CmcQuotesLatestV3Response, idToSymbol, result);
    } catch (error: any) {
      this.logger.warn(`[Fiat Rate] CMC v3 quotes failed (${params.convert}), trying v1: ${error?.message || error}`);
      const fallback = await firstValueFrom(
        this.httpService.get(`${this.config.cmcApiUrl}/v1/cryptocurrency/quotes/latest`, {
          headers,
          params,
          timeout: 10000
        })
      );
      this.parseV1Response(fallback?.data as CmcQuotesLatestV1Response, idToSymbol, result);
    }

    const writes: Promise<void>[] = [];
    result.forEach(byFiat => {
      byFiat.forEach(quote => {
        writes.push(this.writeCachedQuote(quote));
      });
    });
    await Promise.all(writes);
    return result;
  }

  private parseV3Response(
    data: CmcQuotesLatestV3Response | undefined,
    idToSymbol: Map<number, string>,
    result: Map<string, Map<string, CryptoQuote>>
  ): void {
    const assets: CmcAssetV3[] = Array.isArray(data?.data) ? (data?.data as CmcAssetV3[]) : [];
    if (assets.length === 0) {
      throw new Error(data?.status?.error_message || 'CMC v3 response contained no assets');
    }

    assets.forEach(asset => {
      const symbol = (asset.symbol || idToSymbol.get(asset.id) || '').toUpperCase();
      if (!symbol) return;
      if (Array.isArray(asset.quote)) {
        asset.quote.forEach(entry => {
          const fiat = (entry.symbol || '').toUpperCase();
          if (!fiat || !entry.price || entry.price <= 0) return;
          result.get(symbol)?.set(fiat, {
            coin: symbol,
            fiat,
            price: entry.price,
            ts: toUnixSeconds(entry.last_updated),
            source: 'cmc-direct'
          });
        });
      } else if (asset.quote && typeof asset.quote === 'object') {
        Object.entries(asset.quote).forEach(([fiatRaw, quote]) => {
          const fiat = fiatRaw.toUpperCase();
          if (!quote?.price || quote.price <= 0) return;
          result.get(symbol)?.set(fiat, {
            coin: symbol,
            fiat,
            price: quote.price,
            ts: toUnixSeconds(quote.last_updated),
            source: 'cmc-direct'
          });
        });
      }
    });
  }

  private parseV1Response(
    data: CmcQuotesLatestV1Response | undefined,
    idToSymbol: Map<number, string>,
    result: Map<string, Map<string, CryptoQuote>>
  ): void {
    const assets = data?.data && typeof data.data === 'object' ? Object.values(data.data) : [];
    if (assets.length === 0) {
      throw new Error(data?.status?.error_message || 'CMC v1 response contained no assets');
    }

    assets.forEach(asset => {
      const symbol = (asset.symbol || idToSymbol.get(asset.id) || '').toUpperCase();
      if (!symbol || !asset.quote) return;
      Object.entries(asset.quote).forEach(([fiatRaw, quote]) => {
        const fiat = fiatRaw.toUpperCase();
        if (!quote?.price || quote.price <= 0) return;
        result.get(symbol)?.set(fiat, {
          coin: symbol,
          fiat,
          price: quote.price,
          ts: toUnixSeconds(quote.last_updated),
          source: 'cmc-direct'
        });
      });
    });
  }
}
