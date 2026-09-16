import { ConfigService } from '@nestjs/config';
import { CoinMarketCapProvider } from './coinmarketcap.provider';
import { FiatRateService } from './fiat-rate.service';
import { OpenExchangeRatesProvider } from './open-exchange-rates.provider';

describe('FiatRateService', () => {
  const usdTs = 1700000000;

  function createRedisMock(store = new Map<string, string>()) {
    return {
      store,
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      })
    };
  }

  function createConfig(values: Record<string, string> = {}) {
    return {
      get: jest.fn((key: string) => values[key])
    } as unknown as ConfigService;
  }

  function createCmcMock(quotes: Map<string, Map<string, any>>) {
    return {
      isConfigured: jest.fn(() => true),
      getQuotes: jest.fn(async () => quotes),
      getUsdPrices: jest.fn(async () => {
        const result = new Map();
        quotes.forEach((byFiat, coin) => {
          const usd = byFiat.get('USD');
          if (usd) result.set(coin, usd);
        });
        return result;
      })
    } as unknown as CoinMarketCapProvider;
  }

  it('merges direct CMC USD with OER-derived VND and caches the result', async () => {
    const redis = createRedisMock();
    const config = createConfig({ CMC_API_KEY: 'test', OER_APP_ID: 'test' });
    const quotes = new Map([
      ['XEC', new Map([['USD', { coin: 'XEC', fiat: 'USD', price: 0.00001, ts: usdTs, source: 'cmc-direct' }]])]
    ]);
    const cmc = createCmcMock(quotes);
    const oer = {
      getForexRates: jest.fn(async () => ({
        base: 'USD',
        timestamp: usdTs,
        rates: { USD: 1, VND: 25000, EUR: 0.9 }
      }))
    } as unknown as OpenExchangeRatesProvider;

    const service = new FiatRateService(cmc, oer, config, redis as any);
    const first = await service.getAllFiatRates();

    const vnd = first.rates.find(entry => entry.currency === 'VND');
    const xecVnd = vnd?.fiatRates.find(item => item.coin === 'XEC');
    expect(xecVnd?.rate).toBeCloseTo(0.25, 10);

    const xec = first.rates.find(entry => entry.currency === 'XEC');
    expect(xec?.fiatRates.find(item => item.coin === 'VND')?.rate).toBeCloseTo(0.25, 10);
    expect(first.sources.usedCmc).toBe(true);
    expect(first.sources.usedForex).toBe(true);

    // Second call should hit merged cache and not call providers again
    const second = await service.getAllFiatRates();
    expect(second.rates).toHaveLength(first.rates.length);
    expect((cmc.getQuotes as jest.Mock).mock.calls.length).toBe(1);
  });

  it('requests only USD direct quotes on free-tier convert limit', async () => {
    const redis = createRedisMock();
    const config = createConfig({ CMC_API_KEY: 'test', CMC_CONVERT_LIMIT: '1' });
    const cmc = createCmcMock(new Map([['XEC', new Map()]]));
    (cmc.getUsdPrices as jest.Mock).mockResolvedValue(new Map());
    const oer = {
      getForexRates: jest.fn(async () => ({ base: 'USD', timestamp: usdTs, rates: { USD: 1 } }))
    } as unknown as OpenExchangeRatesProvider;

    const service = new FiatRateService(cmc, oer, config, redis as any);
    await expect(service.getAllFiatRates()).rejects.toThrow();
    expect((cmc.getQuotes as jest.Mock).mock.calls[0][1]).toEqual(['USD']);
  });
});
