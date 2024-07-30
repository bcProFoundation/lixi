import { CreateOfferInput, Offer, OfferOrder, PaginationArgs } from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { OfferBasicConnection } from '@bcpros/lixi-models';

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Query(() => Offer)
  async offer(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.offer.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => OfferBasicConnection)
  async allOffer(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({
      name: 'orderBy',
      type: () => OfferOrder,
      nullable: true
    })
    orderBy: OfferOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.offer.findMany({
          include: {
            paymentMethods: true,
            escrowOrders: true
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.offer.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Query(() => OfferBasicConnection)
  async allOfferByPublicKey(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'publicKey', type: () => String }) publicKey: string,
    @Args({
      name: 'orderBy',
      type: () => OfferOrder,
      nullable: true
    })
    orderBy: OfferOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.offer.findMany({
          include: {
            paymentMethods: true,
            escrowOrders: true
          },
          where: {
            publicKey: publicKey
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.offer.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Mutation(() => Offer)
  async createOffer(@Args('data') data: CreateOfferInput) {
    const { paymentMethodIds } = data;

    const offer = await this.prisma.$transaction(async prisma => {
      // Step 1: Create the Offer
      const createdOffer = await prisma.offer.create({
        data: { ..._.omit(data, ['paymentMethodIds']) }
      });

      // Step 2: Create OfferPaymentMethod Entries
      const offerPaymentMethods = paymentMethodIds.map(paymentMethodId => {
        return {
          offerId: createdOffer.id,
          paymentMethodId
        };
      });

      await prisma.offerPaymentMethod.createMany({
        data: offerPaymentMethods
      });

      return createdOffer;
    });

    return offer;
  }

  @ResolveField('paymentMethods', () => String)
  async paymentMethods(@Parent() offer: Offer) {
    const offerPaymentMethod = await this.prisma.offerPaymentMethod.findMany({
      where: {
        offerId: offer.id
      }
    });
    return offerPaymentMethod;
  }
}
