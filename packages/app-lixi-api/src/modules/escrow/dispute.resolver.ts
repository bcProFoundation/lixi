import {
  Account,
  CreateDisputeInput,
  CreateOfferInput,
  CreateWorshipInput,
  CreateWorshipedPersonInput,
  Dispute,
  DisputeConnection,
  DisputeOrder,
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
@Resolver(() => Dispute)
@UseFilters(GqlHttpExceptionFilter)
export class DisputeResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService
  ) {}

  @Subscription(() => Dispute)
  disputeCreated() {
    return pubSub.asyncIterator('disputeCreated');
  }

  @Query(() => Dispute)
  async dispute(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.dispute.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => DisputeConnection)
  async allDispute(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({
      name: 'orderBy',
      type: () => DisputeOrder,
      nullable: true
    })
    orderBy: DisputeOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.dispute.findMany({
          include: {
            escrowOrder: true
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.dispute.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Query(() => DisputeConnection)
  async allDisputeByPublicKey(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'publicKey', type: () => String }) publicKey: string,
    @Args({
      name: 'orderBy',
      type: () => DisputeOrder,
      nullable: true
    })
    orderBy: DisputeOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.dispute.findMany({
          include: {
            escrowOrder: true
          },
          where: {
            escrowOrder: {
              OR: [
                {
                  sellerPublicKey: publicKey
                },
                {
                  arbitratorPublicKey: publicKey
                },
                {
                  buyerPublicKey: publicKey
                }
              ]
            }
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.dispute.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Mutation(() => Dispute)
  async createDispute(@Args('data') data: CreateDisputeInput) {
    const { escrowOrderId } = data;
    const dispute = await this.prisma.dispute.create({
      data: {
        ..._.omit(data, 'escrowOrderId'),
        escrowOrder: {
          connect: {
            id: escrowOrderId
          }
        }
      }
    });

    pubSub.publish('disputeCreated', { disputeCreated: dispute });
    return dispute;
  }

  @ResolveField()
  async escrowOrder(@Parent() dispute: Dispute) {
    const escrowOrder = this.prisma.escrowOrder.findFirst({
      where: {
        dispute: {
          id: dispute.id
        }
      }
    });
    return escrowOrder;
  }
}
