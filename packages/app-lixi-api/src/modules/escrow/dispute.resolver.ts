import {
  Account,
  CreateDisputeInput,
  Dispute,
  DisputeConnection,
  DisputeOrder,
  DisputeStatus,
  EscrowOrderStatus,
  PaginationArgs,
  UpdateDisputeInput
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';

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
  @UseGuards(GqlJwtAuthGuard)
  async dispute(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.dispute.findUnique({
      where: { id: id },
      include: {
        escrowOrder: true
      }
    });

    if (!result) {
      return;
    }

    const { arbitratorAccountId, moderatorAccountId } = result.escrowOrder;

    //TODO: remove if want buyer/seller to view dispute
    if (arbitratorAccountId !== account.id && moderatorAccountId !== account.id) {
      throw new Error('You are not allowed to view the dispute');
    }

    return result;
  }

  @Query(() => DisputeConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allDisputesByAccountId(
    @Args() { after, before, first, last }: PaginationArgs,
    @AccountEntity() account: Account,
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
          where: {
            escrowOrder: {
              OR: [
                {
                  arbitratorAccountId: account.id
                },
                {
                  moderatorAccountId: account.id
                }
              ]
            }
          },
          include: { escrowOrder: true },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () => this.prisma.dispute.count({}),
      { first, last, before, after }
    );
    return result;
  }

  @Mutation(() => Dispute)
  @UseGuards(GqlJwtAuthGuard)
  async createDispute(@AccountEntity() account: Account, @Args('data') data: CreateDisputeInput) {
    const { escrowOrderId, createdBy, reason } = data;

    const escrowOrder = await this.prisma.escrowOrder.findUnique({
      where: {
        id: escrowOrderId
      },
      include: {
        dispute: true
      }
    });

    if (!escrowOrder) {
      throw new Error('Escrow order not found');
    }

    if (escrowOrder.dispute) {
      throw new Error('Escrow order already has a dispute');
    }

    if (escrowOrder.status !== EscrowOrderStatus.ESCROW) {
      throw new Error('Escrow order is not in escrow status');
    }

    if (escrowOrder.sellerAccountId !== account.id && escrowOrder.buyerAccountId !== account.id) {
      throw new Error('You are not allowed to create dispute for this escrow order');
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        createdBy,
        reason,
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

  @Mutation(() => Dispute)
  @UseGuards(GqlJwtAuthGuard)
  async updateDispute(@AccountEntity() account: Account, @Args('data') data: UpdateDisputeInput) {
    const { escrowOrderId, id, status } = data;

    const escrowOrder = await this.prisma.escrowOrder.findUnique({
      where: {
        id: escrowOrderId
      }
    });

    if (!escrowOrder) {
      throw new Error('Escrow order not found');
    }

    if (escrowOrder.arbitratorAccountId !== account.id && escrowOrder.moderatorAccountId !== account.id) {
      throw new Error('You are not allowed to create dispute for this escrow order');
    }

    const dispute = await this.prisma.dispute.update({
      where: {
        id
      },
      data: {
        status
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
