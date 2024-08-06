import { OfferPaymentMethod, PaymentMethod } from '@bcpros/lixi-models';
import { Logger } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => OfferPaymentMethod)
export class OfferPaymentMethodResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @ResolveField('paymentMethod', () => PaymentMethod)
  async paymentMethod(@Parent() offerPaymentMethod: OfferPaymentMethod) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: offerPaymentMethod.paymentMethodId
      }
    });
    return paymentMethod;
  }
}
