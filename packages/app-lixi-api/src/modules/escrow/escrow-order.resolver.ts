import {
  CreateEscrowOrderInput,
  EscrowOrder,
  EscrowOrderConnection,
  EscrowOrderOrder,
  PaginationArgs
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => EscrowOrder)
@UseFilters(GqlHttpExceptionFilter)
export class EscrowOrderResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
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
            postId: offerId
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
