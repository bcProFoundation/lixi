import { Currencies, PaymentMethod, PaymentMethodType } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';

@Resolver(() => Currencies)
export class CurrenciesResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Query(() => [Currencies])
  async allCurrencies() {
    const result = await this.prisma.currencies.findMany({
      where: {
        isSupport: true
      }
    });
    return result;
  }
}
