import {
  chunk,
  derivePrice,
  mergeCryptoFiatRates,
  parseCoinIds,
  parseCsv,
  parsePositiveInt,
  readFiatRateConfig,
  toUnixSeconds
} from './fiat-rate.utils';

describe('fiat-rate.utils', () => {
  describe('parseCsv', () => {
    it('returns fallback when empty', () => {
      expect(parseCsv(undefined, ['USD'])).toEqual(['USD']);
      expect(parseCsv('', ['USD'])).toEqual(['USD']);
    });

    it('normalizes to uppercase and trims', () => {
      expect(parseCsv('usd, vnd ,eur', [])).toEqual(['USD', 'VND', 'EUR']);
    });
  });

  describe('parsePositiveInt', () => {
    it('returns fallback for invalid values', () => {
      expect(parsePositiveInt(undefined, 5)).toBe(5);
      expect(parsePositiveInt('0', 5)).toBe(5);
      expect(parsePositiveInt('-3', 5)).toBe(5);
      expect(parsePositiveInt('abc', 5)).toBe(5);
    });

    it('parses valid values', () => {
      expect(parsePositiveInt('8', 1)).toBe(8);
    });
  });

  describe('parseCoinIds', () => {
    it('includes XEC default', () => {
      expect(parseCoinIds(undefined).XEC).toBe(10791);
    });

    it('supports overrides', () => {
      expect(parseCoinIds('XEC:1,FOO:99')).toMatchObject({ XEC: 1, FOO: 99 });
    });
  });

  describe('readFiatRateConfig', () => {
    it('defaults to cmc-oer with convert limit 1 (free tier safe)', () => {
      const config = readFiatRateConfig(() => undefined);
      expect(config.provider).toBe('cmc-oer');
      expect(config.cmcConvertLimit).toBe(1);
      expect(config.hotFiats).toContain('VND');
      expect(config.hotFiats).toContain('USD');
      expect(config.legacyFallbackEnabled).toBe(true);
    });

    it('reads overrides', () => {
      const values: Record<string, string> = {
        FIAT_RATE_PROVIDER: 'LEGACY',
        CMC_CONVERT_LIMIT: '8',
        FIAT_RATE_LEGACY_FALLBACK_ENABLED: 'false'
      };
      const config = readFiatRateConfig(key => values[key]);
      expect(config.provider).toBe('legacy');
      expect(config.cmcConvertLimit).toBe(8);
      expect(config.legacyFallbackEnabled).toBe(false);
    });
  });

  describe('chunk', () => {
    it('chunks by size', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('toUnixSeconds', () => {
    it('handles ISO strings and numbers', () => {
      expect(toUnixSeconds('2026-01-01T00:00:00.000Z')).toBe(1767225600);
      expect(toUnixSeconds(1767225600)).toBe(1767225600);
      expect(toUnixSeconds(1767225600000)).toBe(1767225600);
    });
  });

  describe('derivePrice', () => {
    it('multiplies crypto USD by forex', () => {
      expect(derivePrice(0.00001, 25000)).toBeCloseTo(0.25, 10);
    });

    it('returns null for invalid inputs', () => {
      expect(derivePrice(undefined, 25000)).toBeNull();
      expect(derivePrice(0.00001, undefined)).toBeNull();
      expect(derivePrice(0, 25000)).toBeNull();
      expect(derivePrice(0.00001, 0)).toBeNull();
    });
  });

  describe('mergeCryptoFiatRates', () => {
    it('prefers direct CMC rates and derives the rest via forex', () => {
      const direct = new Map([['XEC', new Map([['USD', 0.00001]])]]);
      const directTs = new Map([['XEC', new Map([['USD', 1000]])]]);
      const cryptoUsd = new Map([['XEC', 0.00001]]);
      const forex = new Map([
        ['USD', 1],
        ['VND', 25000]
      ]);

      const { fiatGrouped, cryptoGrouped } = mergeCryptoFiatRates({
        fiats: ['USD', 'VND'],
        coins: ['XEC'],
        direct,
        directTs,
        cryptoUsd,
        forex,
        ts: 2000
      });

      expect(fiatGrouped).toHaveLength(2);
      const usd = fiatGrouped.find(entry => entry.currency === 'USD');
      const vnd = fiatGrouped.find(entry => entry.currency === 'VND');
      expect(usd?.fiatRates[0]).toMatchObject({ coin: 'XEC', rate: 0.00001, ts: 1000 });
      expect(vnd?.fiatRates[0]?.rate).toBeCloseTo(0.25, 10);

      const xec = cryptoGrouped.find(entry => entry.currency === 'XEC');
      expect(xec?.fiatRates).toHaveLength(2);
      expect(xec?.fiatRates.find(item => item.coin === 'VND')?.rate).toBeCloseTo(0.25, 10);
    });

    it('skips pairs without direct or derived prices', () => {
      const { fiatGrouped, cryptoGrouped } = mergeCryptoFiatRates({
        fiats: ['USD'],
        coins: ['XEC'],
        direct: new Map([['XEC', new Map()]]),
        directTs: new Map([['XEC', new Map()]]),
        cryptoUsd: new Map(),
        forex: new Map([['USD', 1]]),
        ts: 2000
      });
      expect(fiatGrouped).toHaveLength(0);
      expect(cryptoGrouped).toHaveLength(0);
    });
  });
});
