import { PaymentMethod, PaymentMethodType } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => PaymentMethod)
export class PaymentMethodResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Query(() => [PaymentMethod])
  async allPaymenMethod() {
    const result = await this.prisma.paymentMethod.findMany({});
    const paymentMethodResult: PaymentMethodType[] = result.map(item => {
      return {
        id: item.id,
        name: item.name
      };
    });
    return paymentMethodResult;
  }
}
