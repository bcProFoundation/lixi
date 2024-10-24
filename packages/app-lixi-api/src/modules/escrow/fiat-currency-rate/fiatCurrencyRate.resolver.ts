import { CurrencyRates, FiatRates, LIST_CURRENCIES_USED } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Resolver(() => FiatRates)
export class FiatCurrencyRateResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  @Query(() => [FiatRates])
  async getFiatRate() {
    try {
      const resultData: FiatRates[] = [];

      // Use Promise.all to fetch all rates concurrently
      const ratePromises = LIST_CURRENCIES_USED.map(async currencyInfo => {
        const currency = currencyInfo.code;
        const response = await this.httpService
          .get(`${this.configService.get<string>('BITCORE_URL')}/${currency ?? 'USD'}`)
          .toPromise();

        if (response?.status !== 200) {
          throw new Error(`Failed to fetch fiat rates for ${currency}`);
        }

        const data = response.data;

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
      });

      // Wait for all the promises to complete
      await Promise.all(ratePromises);

      return resultData;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
