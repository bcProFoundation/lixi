import { AllFiatRates, FiatRates, LIST_CURRENCIES_USED } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CoinMarketCapProvider } from './coinmarketcap.provider';
import { OpenExchangeRatesProvider } from './open-exchange-rates.provider';
import { DEFAULT_MAJOR_CURRENCIES, FIAT_RATE_REDIS_KEYS } from './fiat-rate.constants';
import { FiatRateProviderConfig } from './fiat-rate.types';
import { mergeCryptoFiatRates, readFiatRateConfig } from './fiat-rate.utils';

export interface FiatRateSources {
  directPairs: number;
  derivedPairs: number;
  usedCmc: boolean;
  usedForex: boolean;
}

@Injectable()
export class FiatRateService {
  private readonly logger = new Logger(FiatRateService.name);
  private config: FiatRateProviderConfig;
  private readonly majorCurrencies = DEFAULT_MAJOR_CURRENCIES;
  private readonly minMajorCurrenciesRequired: number;

  constructor(
    private readonly cmcProvider: CoinMarketCapProvider,
    private readonly oerProvider: OpenExchangeRatesProvider,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis
  ) {
    this.config = readFiatRateConfig(key => this.configService.get<string>(key));
    const minMajorEnv = this.configService.get<string>('FIAT_RATE_MIN_MAJOR_CURRENCIES');
    const parsed = minMajorEnv ? parseInt(minMajorEnv, 10) : NaN;
    this.minMajorCurrenciesRequired = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }

  isNewProviderEnabled(): boolean {
    return this.config.provider !== 'legacy';
  }

  isConfigured(): boolean {
    return this.cmcProvider.isConfigured();
  }

  getSupportedFiats(): string[] {
    return LIST_CURRENCIES_USED.map(item => item.code.toUpperCase());
  }

  getSupportedCoins(): string[] {
    return [...this.config.cmcCoins.map(coin => coin.toUpperCase())];
  }

  async getAllFiatRates(): Promise<{ rates: AllFiatRates[]; sources: FiatRateSources }> {
    const cached = await this.readMergedCache();
    if (cached) return cached;

    if (!this.cmcProvider.isConfigured()) {
      throw new Error('CMC_API_KEY is not configured');
    }

    const fiats = this.getSupportedFiats();
    const coins = this.getSupportedCoins();
    const now = Math.floor(Date.now() / 1000);

    const directFiats = this.selectDirectFiats(fiats);
    const directQuotes = await this.cmcProvider.getQuotes(coins, directFiats);
    const usdQuotes = await this.cmcProvider.getUsdPrices(coins);
    const forex = await this.oerProvider.getForexRates().catch((error: any) => {
      this.logger.warn(`[Fiat Rate] Forex fetch failed, continuing with CMC-only rates: ${error?.message || error}`);
      return null;
    });

    const direct = new Map<string, Map<string, number>>();
    const directTs = new Map<string, Map<string, number>>();
    coins.forEach(coin => {
      direct.set(coin, new Map<string, number>());
      directTs.set(coin, new Map<string, number>());
    });
    directQuotes.forEach((byFiat, coin) => {
      byFiat.forEach((quote, fiat) => {
        direct.get(coin)?.set(fiat, quote.price);
        directTs.get(coin)?.set(fiat, quote.ts);
      });
    });

    const cryptoUsd = new Map<string, number>();
    usdQuotes.forEach((quote, coin) => {
      if (quote.price > 0) cryptoUsd.set(coin, quote.price);
    });

    const forexMap = new Map<string, number>([['USD', 1]]);
    if (forex?.rates) {
      Object.entries(forex.rates).forEach(([code, rate]: [string, number]) => {
        if (typeof rate === 'number' && rate > 0) forexMap.set(code.toUpperCase(), rate);
      });
    }

    const { fiatGrouped, cryptoGrouped } = mergeCryptoFiatRates({
      fiats,
      coins,
      direct,
      directTs,
      cryptoUsd,
      forex: forexMap,
      ts: now
    });

    const rates = [...fiatGrouped, ...cryptoGrouped];
    this.validateMergedRates(fiatGrouped);

    let directPairs = 0;
    direct.forEach(byFiat => {
      directPairs += byFiat.size;
    });
    let totalPairs = 0;
    fiatGrouped.forEach(entry => {
      totalPairs += entry.fiatRates.length;
    });

    const result = {
      rates,
      sources: {
        directPairs,
        derivedPairs: Math.max(0, totalPairs - directPairs),
        usedCmc: directPairs > 0 || cryptoUsd.size > 0,
        usedForex: Boolean(forex)
      }
    };

    await this.writeMergedCache(result);
    return result;
  }

  async getFiatRates(): Promise<FiatRates[]> {
    const { rates } = await this.getAllFiatRates();
    const byCurrency = new Map<string, AllFiatRates>();
    rates.forEach(entry => {
      if (!byCurrency.has(entry.currency)) byCurrency.set(entry.currency, entry);
    });

    return this.getSupportedFiats()
      .map(currency => byCurrency.get(currency))
      .filter((entry): entry is AllFiatRates => Boolean(entry))
      .map(entry => ({
        currency: entry.currency,
        fiatRates: entry.fiatRates.map(item => ({
          coin: item.coin,
          rates: [{ ts: item.ts, rate: item.rate }]
        }))
      }));
  }

  private selectDirectFiats(allFiats: string[]): string[] {
    const available = new Set(allFiats);
    const hot = this.config.hotFiats.filter(fiat => available.has(fiat));
    const warm = this.config.warmFiats.filter(fiat => available.has(fiat));

    if (this.config.cmcConvertLimit <= 1) {
      return available.has('USD') ? ['USD'] : hot.slice(0, 1);
    }

    const direct = [...hot];
    for (const fiat of warm) {
      if (!direct.includes(fiat)) direct.push(fiat);
    }
    return direct;
  }

  private validateMergedRates(fiatGrouped: AllFiatRates[]): void {
    if (fiatGrouped.length === 0) {
      throw new Error('No fiat rates available from CMC/OER providers');
    }

    let majorWithRates = 0;
    let withRates = 0;
    fiatGrouped.forEach(entry => {
      const hasRate = entry.fiatRates.some(item => item.rate > 0);
      if (!hasRate) return;
      withRates += 1;
      if (this.majorCurrencies.includes(entry.currency)) majorWithRates += 1;
    });

    const hasMajor = majorWithRates >= this.minMajorCurrenciesRequired;
    const hasCoverage = withRates / fiatGrouped.length >= 0.5;
    if (!hasMajor && !hasCoverage) {
      throw new Error(
        `Insufficient non-zero rates: ${majorWithRates} major currencies, ${withRates}/${fiatGrouped.length} total`
      );
    }
  }

  private async readMergedCache(): Promise<{ rates: AllFiatRates[]; sources: FiatRateSources } | null> {
    try {
      const raw = await this.redis.get(FIAT_RATE_REDIS_KEYS.merged);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { rates: AllFiatRates[]; sources: FiatRateSources };
      if (!Array.isArray(parsed?.rates) || parsed.rates.length === 0) return null;
      return parsed;
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] Merged cache read failed: ${error?.message || error}`);
      return null;
    }
  }

  private async writeMergedCache(value: { rates: AllFiatRates[]; sources: FiatRateSources }): Promise<void> {
    try {
      await this.redis.set(FIAT_RATE_REDIS_KEYS.merged, JSON.stringify(value), 'EX', this.config.mergedTtlSeconds);
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] Merged cache write failed: ${error?.message || error}`);
    }
  }
}
