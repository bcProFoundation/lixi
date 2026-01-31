import { AllFiatRates, CurrencyRates, FiatRates } from '@bcpros/lixi-models';
import { Logger, Optional } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../../telegram/telegram-bot.constants';

// Type definitions for better type safety
interface CurrencyInfo {
  code: string;
  name: string;
  fixAmount: number;
  country: string;
}

interface FiatRateEntry {
  ts: number;
  rate: number;
}

interface FiatRateV2Response {
  [coin: string]: FiatRateEntry[];
}

interface FiatRateV3Item {
  ts: number;
  code: string;
  name: string;
  rate: number;
}

interface FiatRateV4Item {
  coin: string;
  ts: number;
  rate: number;
}

interface GraphQLFiatRateEntry {
  coin: string;
  ts: number;
  rate: number;
}

interface FiatRateV3Response {
  [currency: string]: FiatRateV3Item[];
}

interface FiatRateV4Response {
  [currency: string]: FiatRateV4Item[];
}

// List of currencies used for fetching rates
const LIST_CURRENCIES_USED: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', fixAmount: 100, country: 'US' },
  { code: 'EUR', name: 'Euro', fixAmount: 1000, country: 'EU' },
  { code: 'GBP', name: 'British Pound Sterling', fixAmount: 1000, country: 'GB' },
  { code: 'JPY', name: 'Japanese Yen', fixAmount: 1, country: 'JP' },
  { code: 'AUD', name: 'Australian Dollar', fixAmount: 10000, country: 'AU' },
  { code: 'CAD', name: 'Canadian Dollar', fixAmount: 100, country: 'CA' },
  { code: 'CHF', name: 'Swiss Franc', fixAmount: 100, country: 'CH' },
  { code: 'CNY', name: 'Chinese Yuan', fixAmount: 1000, country: 'CN' },
  { code: 'SEK', name: 'Swedish Krona', fixAmount: 100, country: 'SE' },
  { code: 'NZD', name: 'New Zealand Dollar', fixAmount: 10000, country: 'NZ' },
  { code: 'MXN', name: 'Mexican Peso', fixAmount: 1000, country: 'MX' },
  { code: 'SGD', name: 'Singapore Dollar', fixAmount: 1000, country: 'SG' },
  { code: 'HKD', name: 'Hong Kong Dollar', fixAmount: 10000, country: 'HK' },
  { code: 'NOK', name: 'Norwegian Krone', fixAmount: 100, country: 'NO' },
  { code: 'KRW', name: 'South Korean Won', fixAmount: 10, country: 'KR' },
  { code: 'TRY', name: 'Turkish Lira', fixAmount: 1000000, country: 'TR' },
  { code: 'RUB', name: 'Russian Ruble', fixAmount: 100000, country: 'RU' },
  { code: 'INR', name: 'Indian Rupee', fixAmount: 100000, country: 'IN' },
  { code: 'BRL', name: 'Brazilian Real', fixAmount: 1000000, country: 'BR' },
  { code: 'ZAR', name: 'South African Rand', fixAmount: 1000000, country: 'ZA' },
];

@Resolver(() => FiatRates)
export class FiatCurrencyRateResolver {
  // Major supported cryptocurrencies that must have rates
  // These are the coins that users can trade on the platform
  private readonly MAJOR_COINS = ['XEC', 'BCH', 'XRP', 'ETH', 'BTC', 'DOGE', 'LTC'];

  // Major fiat currencies for base conversion (USD is critical for converting to all other currencies)
  // At minimum, we need USD for currency conversion chains: VND->USD->XEC
  private readonly MAJOR_FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Optional()
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME)
    private readonly notificationBot: Telegraf
  ) {
    if (!this.notificationBot) {
      this.logger.debug('[Fiat Rate] Telegram notification bot not configured (token missing)');
    } else {
      this.logger.log('[Fiat Rate] Telegram notification bot initialized');
    }
  }

  /**
   * Send Telegram notification for fiat rate errors
   * Notifies a configured group/channel when fallback is used or all endpoints fail
   */
  private async sendTelegramErrorNotification(
    errorType: 'FALLBACK_USED' | 'ALL_ENDPOINTS_FAILED' | 'DEGRADED_DATA',
    details: {
      primaryUrl?: string;
      failedUrls?: Array<{ url: string; reason: string }>;
      successUrl?: string;
      errorMessage?: string;
      timestamp?: string;
      majorCurrenciesAvailable?: number;
      totalCurrenciesAvailable?: number;
    }
  ): Promise<void> {
    try {
      // Check if notification bot is configured
      if (!this.notificationBot) {
        this.logger.debug('[Fiat Rate] Telegram notification bot not configured, skipping notification');
        return;
      }

      const telegramErrorChatId = this.configService.get<string>('TELEGRAM_ERROR_NOTIFICATION_CHAT_ID');

      if (!telegramErrorChatId) {
        this.logger.debug('[Fiat Rate] TELEGRAM_ERROR_NOTIFICATION_CHAT_ID not configured, skipping notification');
        return;
      }

      const timestamp = details.timestamp || new Date().toISOString();
      const environment = this.configService.get<string>('DEPLOY_ENVIRONMENT') || 'unknown';

      let message = '';

      if (errorType === 'FALLBACK_USED') {
        message = `🟡 *Fiat Rate API Fallback Activated*\n\n`;
        message += `*Environment*: ${environment}\n`;
        message += `*Time*: ${timestamp}\n\n`;
        message += `*Primary URL Failed*:\n\`${details.primaryUrl}\`\n\n`;

        // Show details of all failed URLs
        if (details.failedUrls && details.failedUrls.length > 0) {
          message += `*Failed Attempts*:\n`;
          details.failedUrls.forEach((failed, index) => {
            message += `${index + 1}. \`${failed.url}\`\n   _Reason: ${failed.reason}_\n`;
          });
          message += `\n`;
        }

        message += `*Fallback URL Used Successfully*:\n\`${details.successUrl}\`\n`;
        message += `*Data Quality*: ${details.majorCurrenciesAvailable || 0} major currencies, ${details.totalCurrenciesAvailable || 0} total currencies\n\n`;
        message += `⚠️ Primary endpoint is experiencing issues. Please investigate.`;
      } else if (errorType === 'DEGRADED_DATA') {
        message = `🟠 *Fiat Rate API Returning Degraded Data*\n\n`;
        message += `*Environment*: ${environment}\n`;
        message += `*Time*: ${timestamp}\n\n`;
        message += `*Issue*: Fallback service returning incomplete currency data\n`;
        message += `*Data Quality*: Only ${details.majorCurrenciesAvailable || 0} major currencies available (need at least 3)\n`;
        message += `*URL*: \`${details.successUrl}\`\n\n`;
        message += `⚠️ Fallback endpoint is returning insufficient data. Users may see incomplete price information.`;
      } else if (errorType === 'ALL_ENDPOINTS_FAILED') {
        message = `🔴 *CRITICAL: All Fiat Rate APIs Failed*\n\n`;
        message += `*Environment*: ${environment}\n`;
        message += `*Time*: ${timestamp}\n\n`;
        message += `*All URLs Failed*:\n`;

        details.failedUrls?.forEach((failed, index) => {
          message += `${index + 1}. \`${failed.url}\`\n   _Reason: ${failed.reason}_\n`;
        });

        message += `\n*Last Error*: ${details.errorMessage || 'Unknown error'}\n\n`;
        message += `🚨 *ACTION REQUIRED*: Users cannot place Goods & Services orders!`;
      }

      await this.notificationBot.telegram.sendMessage(telegramErrorChatId, message, {
        parse_mode: 'Markdown'
      });

      this.logger.log(`[Fiat Rate] Telegram notification sent to chat ${telegramErrorChatId}`);
    } catch (error: any) {
      // Don't let notification errors break the main flow
      this.logger.error(`[Fiat Rate] Failed to send Telegram notification: ${error?.message || error}`);
    }
  }

  /**
   * Get fallback URLs from environment configuration
   * Returns array of URLs to try in order: [primary, fallback1, fallback2, ...]
   */
  private getFallbackUrls(): string[] {
    const primaryUrl = this.configService.get<string>('BITCORE_URL');
    const fallbackUrlsStr = this.configService.get<string>('BITCORE_URL_FALLBACK');

    const urls: string[] = [];

    // Add primary URL if configured
    if (primaryUrl) {
      urls.push(primaryUrl);
    }

    // Add fallback URLs if configured (can be comma-separated)
    if (fallbackUrlsStr) {
      const fallbackUrls = fallbackUrlsStr
        .split(',')
        .map(url => url.trim())
        .filter(Boolean);
      urls.push(...fallbackUrls);
    }

    // Ensure we have at least one URL
    if (urls.length === 0) {
      this.logger.warn('[Fiat Rate] No BITCORE_URL configured, using default production endpoint');
      urls.push('https://aws.abcpay.cash/bws/api');
    }

    return urls;
  }

  /**
   * Fetch data with fallback strategy
   */
  private async fetchWithFallback<T>(endpoint: string, timeout: number = 10000): Promise<T> {
    const fallbackUrls = this.getFallbackUrls();
    let lastError: any = null;

    for (const baseUrl of fallbackUrls) {
      try {
        this.logger.log(`[Fiat Rate] Attempting to fetch from: ${baseUrl}${endpoint}`);

        const response = await firstValueFrom(this.httpService.get(`${baseUrl}${endpoint}`, { timeout }));

        if (response?.status === 200) {
          const data = response.data;

          // Validate that we have actual data (not empty or all zeros)
          if (this.validateFiatRateData(data, endpoint)) {
            this.logger.log(`[Fiat Rate] Successfully fetched valid data from: ${baseUrl}${endpoint}`);
            return data as T;
          } else {
            throw new Error(
              `Invalid data for endpoint ${baseUrl}${endpoint}: empty response or all rates are zero (validation failed)`
            );
          }
        }

        throw new Error(`HTTP ${response?.status}: ${response?.statusText}`);
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`[Fiat Rate] Failed to fetch from ${baseUrl}${endpoint}: ${error?.message || error}`);
        // Continue to next fallback URL
      }
    }

    // All fallbacks failed
    this.logger.error(
      `[Fiat Rate] All endpoints failed for ${endpoint}. Last error: ${lastError?.message || lastError}`
    );
    throw lastError;
  }

  /**
   * Validate fiat rate data to ensure it's not empty or contains only zero rates
   * For v3 API, we check that major currencies have non-zero rates
   */
  private validateFiatRateData(
    data: FiatRateV2Response | FiatRateV3Response | FiatRateV4Response,
    endpoint: string
  ): boolean {
    if (!data || typeof data !== 'object') {
      this.logger.warn('[Fiat Rate] Data is null or not an object');
      return false;
    }

    // For v3 API (/v3/fiatrates/) or v4 API (/v4/allfiatrates/)
    if (endpoint.includes('/v3/fiatrates') || endpoint.includes('/v4/allfiatrates')) {
      const currencies = Object.keys(data);
      if (currencies.length === 0) {
        this.logger.warn(`[Fiat Rate] No currencies in ${endpoint} response`);
        return false;
      }

      // Check if we have actual currency data (not just empty arrays)
      const hasValidData = currencies.some(currency => {
        const rates = data[currency];
        return Array.isArray(rates) && rates.length > 0;
      });

      if (!hasValidData) {
        this.logger.warn(`[Fiat Rate] ${endpoint} response has no valid currency data`);
        return false;
      }

      // Count how many major currencies have at least one non-zero rate
      let majorCurrenciesWithRates = 0;
      let totalRatesChecked = 0;
      let nonZeroRatesCount = 0;

      for (const currency of currencies) {
        const rates = data[currency];
        if (Array.isArray(rates) && rates.length > 0) {
          // Check if this currency has any non-zero rates
          // v3/v4 API returns array of objects with rate property
          const hasNonZeroRate = rates.some((item: any) => item.rate && item.rate > 0);

          totalRatesChecked++;
          if (hasNonZeroRate) {
            nonZeroRatesCount++;

            // If this is a major fiat currency, count it
            const currencyCode = currency.toUpperCase();
            if (this.MAJOR_FIAT_CURRENCIES.includes(currencyCode)) {
              majorCurrenciesWithRates++;
            }
          }
        }
      }

      // Log diagnostic information
      this.logger.debug(
        `[Fiat Rate] ${endpoint} validation: ${nonZeroRatesCount}/${totalRatesChecked} currencies have non-zero rates, ` +
        `${majorCurrenciesWithRates} major currencies with rates`
      );

      // Validation logic:
      // 1. If we have at least 3 major currencies with non-zero rates, consider it valid
      // 2. OR if at least 50% of all currencies have non-zero rates (and we have some data)
      const hasSufficientMajorCurrencies = majorCurrenciesWithRates >= 3;
      const hasSufficientOverallCoverage = totalRatesChecked > 0 && nonZeroRatesCount / totalRatesChecked >= 0.5;

      if (!hasSufficientMajorCurrencies && !hasSufficientOverallCoverage) {
        this.logger.warn(
          `[Fiat Rate] ${endpoint} response has insufficient non-zero rates: ` +
          `${majorCurrenciesWithRates} major currencies, ${nonZeroRatesCount}/${totalRatesChecked} total (${((nonZeroRatesCount / totalRatesChecked) * 100).toFixed(1)}%)`
        );
        return false;
      }

      return true;
    }

    // For v2 API (/v2/fiatrates/{currency})
    if (endpoint.includes('/v2/fiatrates')) {
      const coins = Object.keys(data);
      if (coins.length === 0) {
        this.logger.warn('[Fiat Rate] No coins in v2 response');
        return false;
      }

      // Check if we have actual rate data and not all zeros
      let hasNonZeroRate = false;
      for (const coin of coins) {
        const rates = data[coin];
        if (Array.isArray(rates) && rates.length > 0) {
          // Check if any rate is non-zero
          hasNonZeroRate = rates.some((entry: FiatRateEntry) => entry.rate && entry.rate > 0);
          if (hasNonZeroRate) break;
        }
      }

      if (!hasNonZeroRate) {
        this.logger.warn('[Fiat Rate] v2 response has only zero rates');
        return false;
      }

      return true;
    }

    // Default: assume valid if we have any data
    return true;
  }
  @Query(() => [FiatRates])
  async getFiatRate() {
    try {
      const resultData: FiatRates[] = [];

      // Use Promise.all to fetch all rates concurrently
      const ratePromises = LIST_CURRENCIES_USED.map(async (currencyInfo: CurrencyInfo) => {
        const currency = currencyInfo.code;

        try {
          const data = await this.fetchWithFallback<FiatRateV2Response>(`/v2/fiatrates/${currency ?? 'USD'}`);

          // Add the response data to the resultData object with the currency as the key
          const fiatRates: CurrencyRates[] = Object.keys(data).map(coin => {
            const rates =
              data[coin]?.map((entry: FiatRateEntry) => ({
                ts: Math.floor(entry.ts / 1000), //convert to second
                rate: entry.rate
              })) || [];

            return { coin, rates };
          });
          resultData.push({ currency, fiatRates });
        } catch (error: any) {
          this.logger.error(`[Fiat Rate] Failed to fetch rates for ${currency}: ${error?.message}`);
          // Continue with other currencies even if one fails
        }
      });

      // Wait for all the promises to complete
      await Promise.all(ratePromises);

      return resultData;
    } catch (error: any) {
      this.logger.error(`[Fiat Rate] getFiatRate error: ${error?.message}`);
      return []; // Return empty array instead of undefined
    }
  }

  @Query(() => [AllFiatRates])
  async getAllFiatRate() {
    try {
      // Get fallback URLs
      const urls = this.getFallbackUrls();
      let lastError: any = null;
      let primaryUrlFailed = false;
      const failedUrls: Array<{ url: string; reason: string }> = [];

      // Try each URL until we get valid non-zero rates
      for (let i = 0; i < urls.length; i++) {
        const baseUrl = urls[i];
        const isPrimaryUrl = i === 0;

        try {
          const endpoint = '/v4/allfiatrates/';
          const url = `${baseUrl}${endpoint}`;

          this.logger.log(`[Fiat Rate] Attempting getAllFiatRate from: ${url}`);

          // Exponential backoff retry strategy
          const maxRetries = 3;
          let attempt = 0;
          let response;
          let lastFetchError: any = null;

          while (attempt < maxRetries) {
            try {
              response = await firstValueFrom(
                this.httpService.get(url, { timeout: 3000 + attempt * 2000 }).pipe(
                  catchError((error: AxiosError) => {
                    this.logger.error(
                      `[Fiat Rate] Request failed for ${url} (attempt ${attempt + 1}): ${error.message}`
                    );
                    throw error;
                  })
                )
              );
              break; // Success, exit loop
            } catch (fetchError: any) {
              lastFetchError = fetchError;
              attempt++;
              if (attempt < maxRetries) {
                const backoff = Math.pow(2, attempt) * 500;
                this.logger.warn(`[Fiat Rate] Retrying ${url} in ${backoff}ms (attempt ${attempt + 1})`);
                await new Promise(res => setTimeout(res, backoff));
              }
            }
          }

          if (!response) {
            const errorReason = `Connection error: ${lastFetchError?.message || 'Unknown error'}`;
            this.logger.warn(`[Fiat Rate] ${errorReason}`);
            lastError = lastFetchError || new Error('Failed to fetch fiat rates after retries');
            failedUrls.push({ url, reason: errorReason });
            if (isPrimaryUrl) primaryUrlFailed = true;
            continue;
          }

          const data = response?.data;

          // Validate v4 response structure
          if (!this.validateFiatRateData(data, endpoint)) {
            const errorReason = 'Invalid v4 response structure';
            this.logger.warn(`[Fiat Rate] ${errorReason} for ${url}`);
            lastError = new Error(errorReason);
            failedUrls.push({ url, reason: errorReason });
            if (isPrimaryUrl) primaryUrlFailed = true;
            continue;
          }

          // Transform v4 format to AllFiatRates format
          // v4 returns: { AED: [{coin, ts, rate}, ...], ... }
          // GraphQL expects: { currency, fiatRates: [{coin, ts, rate}, ...] }
          const fiatRates: AllFiatRates[] = Object.keys(data).map(currency => {
            return {
              currency: currency.toUpperCase(),
              fiatRates: data[currency].map((item: FiatRateV4Item) => ({
                coin: item.coin,
                ts: item.ts,
                rate: item.rate || 0 // Use rate from API, fallback to 0
              }))
            };
          });

          // Check if we have sufficient coin and currency coverage
          // We need: 1) At least 3 major coins with rates, 2) USD rates for fiat conversion
          let majorCoinsWithRates = 0;
          let hasUSDRates = false;
          let totalCoinsInUSD = 0;

          // First, check USD rates - this is critical for converting any fiat to any other fiat
          const usdData = fiatRates.find(f => f.currency === 'USD');
          if (usdData) {
            const usdCoinsWithRates = usdData.fiatRates.filter((rate: GraphQLFiatRateEntry) => rate.rate > 0);
            totalCoinsInUSD = usdCoinsWithRates.length;
            hasUSDRates = usdCoinsWithRates.length > 0;

            // Count how many major coins have USD rates
            majorCoinsWithRates = usdCoinsWithRates.filter((rate: GraphQLFiatRateEntry) =>
              this.MAJOR_COINS.includes(rate.coin?.toUpperCase())
            ).length;
          }

          // Log diagnostic information
          this.logger.log(
            `[Fiat Rate] Validation: ${majorCoinsWithRates} major coins with USD rates (need 3+), ` +
            `${totalCoinsInUSD} total coins in USD, USD available: ${hasUSDRates}`
          );

          // Validation: Need at least 3 major coins AND USD rates for conversion
          // USD is essential because it's the bridge currency for all fiat conversions
          const hasSufficientMajorCoins = majorCoinsWithRates >= 3;
          const hasCriticalCurrencyForConversion = hasUSDRates;

          if (!hasSufficientMajorCoins || !hasCriticalCurrencyForConversion) {
            const errorReason =
              `Insufficient coin coverage: ${majorCoinsWithRates}/3 major coins with USD rates, ` +
              `USD rates available: ${hasUSDRates}. Major coins needed: ${this.MAJOR_COINS.join(', ')}`;
            this.logger.warn(`[Fiat Rate] ${errorReason} from ${url}, trying next fallback`);
            lastError = new Error(errorReason);
            failedUrls.push({ url, reason: errorReason });
            if (isPrimaryUrl) primaryUrlFailed = true;
            continue;
          }

          // Success - we have valid non-zero rates
          this.logger.log(`[Fiat Rate] Successfully fetched rates for ${fiatRates.length} currencies from ${url}`);

          // Send notification if we used a fallback (primary URL failed but fallback succeeded)
          if (primaryUrlFailed && !isPrimaryUrl) {
            // Check if the fallback is returning degraded data (insufficient major coins)
            if (!hasSufficientMajorCoins) {
              // Fallback is working but returning incomplete data
              await this.sendTelegramErrorNotification('DEGRADED_DATA', {
                successUrl: url,
                majorCurrenciesAvailable: majorCoinsWithRates,
                totalCurrenciesAvailable: totalCoinsInUSD,
                timestamp: new Date().toISOString()
              });
            } else {
              // Fallback is working with sufficient data
              await this.sendTelegramErrorNotification('FALLBACK_USED', {
                primaryUrl: urls[0],
                successUrl: url,
                failedUrls: failedUrls,
                errorMessage: lastError?.message || 'Unknown error',
                majorCurrenciesAvailable: majorCoinsWithRates,
                totalCurrenciesAvailable: totalCoinsInUSD,
                timestamp: new Date().toISOString()
              });
            }
          }

          return fiatRates;
        } catch (error: any) {
          const errorReason = `Exception: ${error?.message || error}`;
          this.logger.error(`[Fiat Rate] Failed to fetch from ${baseUrl}: ${errorReason}`);
          lastError = error;
          failedUrls.push({ url: `${baseUrl}${'/v4/allfiatrates/'}`, reason: errorReason });
          if (isPrimaryUrl) primaryUrlFailed = true;
          continue;
        }
      }

      // All URLs failed - send critical notification
      const errorMessage = 'All fiat rate APIs returned zero rates or failed';

      this.logger.error(`[Fiat Rate] ${errorMessage}. Last error: ${lastError?.message || 'Unknown error'}`);

      // Send critical notification
      await this.sendTelegramErrorNotification('ALL_ENDPOINTS_FAILED', {
        failedUrls: failedUrls,
        errorMessage: lastError?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Throw error to be caught by GraphQL and returned to frontend
      throw new Error(errorMessage);
    } catch (error: any) {
      this.logger.error(`[Fiat Rate] getAllFiatRate error: ${error?.message || error}`);
      throw error; // Propagate error to frontend
    }
  }
}
