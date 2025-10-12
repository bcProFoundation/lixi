import { AllFiatRates, CurrencyRates, FiatRates, LIST_CURRENCIES_USED } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
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

@Resolver(() => FiatRates)
export class FiatCurrencyRateResolver {
  private notificationBot: Telegraf | null = null;

  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // Initialize notification bot if token is configured
    const botToken = this.configService.get<string>('TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN');
    if (botToken) {
      try {
        this.notificationBot = new Telegraf(botToken);
        this.logger.log('[Fiat Rate] Telegram notification bot initialized');
      } catch (error: any) {
        this.logger.error(`[Fiat Rate] Failed to initialize Telegram notification bot: ${error?.message}`);
      }
    } else {
      this.logger.debug('[Fiat Rate] TELEGRAM_ERROR_NOTIFICATION_BOT_TOKEN not configured');
    }
  }

  /**
   * Send Telegram notification for fiat rate errors
   * Notifies a configured group/channel when fallback is used or all endpoints fail
   */
  private async sendTelegramErrorNotification(
    errorType: 'FALLBACK_USED' | 'ALL_ENDPOINTS_FAILED',
    details: {
      primaryUrl?: string;
      failedUrls?: string[];
      successUrl?: string;
      errorMessage?: string;
      timestamp?: string;
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
        message += `*Fallback URL Used*:\n\`${details.successUrl}\`\n\n`;
        message += `*Reason*: ${details.errorMessage || 'Zero rates or connection error'}\n\n`;
        message += `⚠️ Primary endpoint is experiencing issues. Please investigate.`;
      } else if (errorType === 'ALL_ENDPOINTS_FAILED') {
        message = `🔴 *CRITICAL: All Fiat Rate APIs Failed*\n\n`;
        message += `*Environment*: ${environment}\n`;
        message += `*Time*: ${timestamp}\n\n`;
        message += `*All URLs Attempted*:\n`;
        details.failedUrls?.forEach((url, index) => {
          message += `${index + 1}. \`${url}\`\n`;
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

        const response = await this.httpService.get(`${baseUrl}${endpoint}`, { timeout }).toPromise();

        if (response?.status === 200) {
          const data = response.data;

          // Validate that we have actual data (not empty or all zeros)
          if (this.validateFiatRateData(data, endpoint)) {
            this.logger.log(`[Fiat Rate] Successfully fetched valid data from: ${baseUrl}${endpoint}`);
            return data as T;
          } else {
            throw new Error('Invalid data: empty or all rates are zero');
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
   */
  private validateFiatRateData(data: any, endpoint: string): boolean {
    if (!data || typeof data !== 'object') {
      this.logger.warn('[Fiat Rate] Data is null or not an object');
      return false;
    }

    // For v3 API (/v3/fiatrates/)
    if (endpoint.includes('/v3/fiatrates')) {
      const currencies = Object.keys(data);
      if (currencies.length === 0) {
        this.logger.warn('[Fiat Rate] No currencies in v3 response');
        return false;
      }

      // Check if we have actual currency data (not just empty arrays)
      const hasValidData = currencies.some(currency => {
        const rates = data[currency];
        return Array.isArray(rates) && rates.length > 0;
      });

      if (!hasValidData) {
        this.logger.warn('[Fiat Rate] v3 response has no valid currency data');
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
          hasNonZeroRate = rates.some((entry: any) => entry.rate && entry.rate > 0);
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
      const ratePromises = LIST_CURRENCIES_USED.map(async (currencyInfo: any) => {
        const currency = currencyInfo.code;

        try {
          const data = await this.fetchWithFallback<any>(`/v2/fiatrates/${currency ?? 'USD'}`);

          // Add the response data to the resultData object with the currency as the key
          const fiatRates: CurrencyRates[] = Object.keys(data).map(coin => {
            const rates =
              data[coin]?.map((entry: any) => ({
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
      const failedUrls: string[] = [];

      // Try each URL until we get valid non-zero rates
      for (let i = 0; i < urls.length; i++) {
        const baseUrl = urls[i];
        const isPrimaryUrl = i === 0;

        try {
          const endpoint = '/v3/fiatrates/';
          const url = `${baseUrl}${endpoint}`;

          this.logger.log(`[Fiat Rate] Attempting getAllFiatRate from: ${url}`);

          const response = await firstValueFrom(
            this.httpService.get(url, { timeout: 10000 }).pipe(
              catchError((error: AxiosError) => {
                this.logger.error(`[Fiat Rate] Request failed for ${url}: ${error.message}`);
                throw error;
              })
            )
          );

          const data = response.data;

          // Validate v3 response structure
          if (!this.validateFiatRateData(data, endpoint)) {
            this.logger.warn(`[Fiat Rate] v3 response validation failed for ${url}`);
            lastError = new Error('Invalid v3 response structure');
            failedUrls.push(url);
            if (isPrimaryUrl) primaryUrlFailed = true;
            continue;
          }

          // Transform v3 format to AllFiatRates format
          // v3 returns: { btc: [{ts, code, name, rate}, ...], xec: [...], etc }
          // GraphQL expects: { currency, fiatRates: [{coin, ts, rate}, ...] }
          const fiatRates: AllFiatRates[] = Object.keys(data).map(currency => {
            return {
              currency: currency.toUpperCase(),
              fiatRates: data[currency].map((item: any) => ({
                coin: item.code,
                ts: item.ts,
                rate: item.rate || 0 // Use rate from API, fallback to 0
              }))
            };
          });

          // Check if we have any non-zero rates
          const hasNonZeroRates = fiatRates.some(currencyData =>
            currencyData.fiatRates.some((rate: any) => rate.rate > 0)
          );

          if (!hasNonZeroRates) {
            this.logger.warn(`[Fiat Rate] All rates are zero from ${url}, trying next fallback`);
            lastError = new Error('All rates are zero');
            failedUrls.push(url);
            if (isPrimaryUrl) primaryUrlFailed = true;
            continue;
          }

          // Success - we have valid non-zero rates
          this.logger.log(`[Fiat Rate] Successfully fetched rates for ${fiatRates.length} currencies from ${url}`);

          // Send notification if we used a fallback (primary URL failed but fallback succeeded)
          if (primaryUrlFailed && !isPrimaryUrl) {
            await this.sendTelegramErrorNotification('FALLBACK_USED', {
              primaryUrl: urls[0],
              successUrl: url,
              failedUrls: failedUrls,
              errorMessage: lastError?.message || 'Unknown error',
              timestamp: new Date().toISOString()
            });
          }

          return fiatRates;
        } catch (error: any) {
          this.logger.error(`[Fiat Rate] Failed to fetch from ${baseUrl}: ${error?.message || error}`);
          lastError = error;
          failedUrls.push(`${baseUrl}/v3/fiatrates/`);
          if (isPrimaryUrl) primaryUrlFailed = true;
          continue;
        }
      }

      // All URLs failed - send critical notification
      const errorMessage = 'All fiat rate APIs returned zero rates or failed';

      this.logger.error(`[Fiat Rate] ${errorMessage}. Last error: ${lastError?.message || 'Unknown error'}`);

      // Send critical notification
      await this.sendTelegramErrorNotification('ALL_ENDPOINTS_FAILED', {
        failedUrls: urls.map(url => `${url}/v3/fiatrates/`),
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
