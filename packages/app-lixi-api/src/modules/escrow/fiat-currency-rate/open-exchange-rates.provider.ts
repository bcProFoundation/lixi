import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Redis } from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { FIAT_RATE_REDIS_KEYS } from './fiat-rate.constants';
import { FiatRateProviderConfig, ForexRates } from './fiat-rate.types';
import { readFiatRateConfig, toUnixSeconds } from './fiat-rate.utils';

interface OerLatestResponse {
  base?: string;
  timestamp?: number;
  rates?: Record<string, number>;
}

@Injectable()
export class OpenExchangeRatesProvider {
  private readonly logger = new Logger(OpenExchangeRatesProvider.name);
  private config: FiatRateProviderConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis
  ) {
    this.config = readFiatRateConfig(key => this.configService.get<string>(key));
  }

  isConfigured(): boolean {
    return Boolean(this.config.oerAppId);
  }

  async getForexRates(): Promise<ForexRates | null> {
    const cached = await this.readCachedRates();
    if (cached) return cached;
    if (!this.isConfigured()) {
      this.logger.debug('[Fiat Rate] OER_APP_ID is not configured, skipping forex fetch');
      return null;
    }

    const response = await firstValueFrom(
      this.httpService.get<OerLatestResponse>(`${this.config.oerApiUrl}/latest.json`, {
        params: { app_id: this.config.oerAppId as string, base: 'USD' },
        timeout: 10000
      })
    );

    const rates = response?.data?.rates;
    if (!rates || typeof rates !== 'object' || Object.keys(rates).length === 0) {
      throw new Error('OER response contained no rates');
    }

    const normalized: Record<string, number> = { USD: 1 };
    Object.entries(rates).forEach(([code, rate]) => {
      const currency = code.toUpperCase();
      if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
        normalized[currency] = rate;
      }
    });

    const result: ForexRates = {
      base: 'USD',
      timestamp: toUnixSeconds(response?.data?.timestamp),
      rates: normalized
    };

    await this.writeCachedRates(result);
    return result;
  }

  private async readCachedRates(): Promise<ForexRates | null> {
    try {
      const raw = await this.redis.get(FIAT_RATE_REDIS_KEYS.oerLatest);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ForexRates;
      if (!parsed?.rates || Object.keys(parsed.rates).length === 0) return null;
      return parsed;
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] OER cache read failed: ${error?.message || error}`);
      return null;
    }
  }

  private async writeCachedRates(value: ForexRates): Promise<void> {
    try {
      await this.redis.set(FIAT_RATE_REDIS_KEYS.oerLatest, JSON.stringify(value), 'EX', this.config.oerTtlSeconds);
    } catch (error: any) {
      this.logger.debug(`[Fiat Rate] OER cache write failed: ${error?.message || error}`);
    }
  }
}
