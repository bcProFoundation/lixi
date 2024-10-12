import { CoinList, Currencies, PaymentMethod, PaymentMethodType } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../prisma/prisma.service';

@Resolver(() => CoinList)
export class CoinListResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Query(() => [CoinList])
  async allCoinList() {
    const result = await this.prisma.coinList.findMany({
      where: {
        isSupport: true
      }
    });
    return result;
  }
}
