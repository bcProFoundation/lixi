import {
  Account,
  CreateOfferInput,
  CreateWorshipInput,
  CreateWorshipedPersonInput,
  Offer,
  OfferConnection,
  OfferOrder,
  PaginationArgs,
  Worship,
  WorshipConnection,
  WorshipOrder,
  WorshipedPerson,
  WorshipedPersonConnection,
  WorshipedPersonOrder
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { connectionFromArraySlice } from 'src/common/custom-graphql-relay/arrayConnection';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import ConnectionArgs, { getPagingParameters } from '../../common/custom-graphql-relay/connection.args';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PERSON } from '../page/constants/meili.constants';
import { MeiliService } from '../page/meili.service';
import { PrismaService } from '../prisma/prisma.service';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService
  ) {}

  @Subscription(() => Offer)
  offerCreated() {
    return pubSub.asyncIterator('offerCreated');
  }

  @Query(() => Offer)
  async offer(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.offer.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => OfferConnection)
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

  @Query(() => OfferConnection)
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

    pubSub.publish('offerCreated', { offerCreated: offer });
    return offer;
  }

  @ResolveField()
  async paymentMethods(@Parent() offer: Offer) {
    const paymentMethods = this.prisma.offerPaymentMethod.findFirst({
      where: {
        offerId: offer.id
      },
      include: {
        paymentMethod: true
      }
    });
    return paymentMethods;
  }
}
