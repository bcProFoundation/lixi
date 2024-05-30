import {
  Account,
  CreateDisputeInput,
  CreateEscrowOrderInput,
  CreateOfferInput,
  CreateWorshipInput,
  CreateWorshipedPersonInput,
  Dispute,
  DisputeConnection,
  DisputeOrder,
  EscrowOrder,
  EscrowOrderConnection,
  EscrowOrderOrder,
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
@Resolver(() => EscrowOrder)
@UseFilters(GqlHttpExceptionFilter)
export class EscrowOrderResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService
  ) {}

  @Subscription(() => EscrowOrder)
  escrowOrderCreated() {
    return pubSub.asyncIterator('escrowOrderCreated');
  }

  @Query(() => EscrowOrder)
  async escrowOrder(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.escrowOrder.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => EscrowOrderConnection)
  async allEscrowOrderByOfferId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'offerId', type: () => String }) offerId: string,
    @Args({
      name: 'orderBy',
      type: () => EscrowOrderOrder,
      nullable: true
    })
    orderBy: EscrowOrderOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.escrowOrder.findMany({
          include: {
            paymentMethod: true
          },
          where: {
            offerId: offerId
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.escrowOrder.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Mutation(() => EscrowOrder)
  async createEscrowOrder(@Args('data') data: CreateEscrowOrderInput) {
    const { offerId, paymentMethodId } = data;
    const escrowOrder = await this.prisma.escrowOrder.create({
      data: {
        ..._.omit(data, 'offerId', 'paymentMethodId'),
        offer: {
          connect: {
            id: offerId
          }
        },
        paymentMethod: {
          connect: {
            id: paymentMethodId
          }
        }
      }
    });

    pubSub.publish('escrowOrderCreated', { escrowOrderCreated: escrowOrder });
    return escrowOrder;
  }
}
