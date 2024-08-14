import {
  AcceptEscrowOrderInput,
  Account,
  CancelEscrowOrderInput,
  CreateEscrowOrderInput,
  EscrowOrderConnection,
  EscrowOrderOrder,
  PaginationArgs,
  EscrowOrder,
  PaymentMethod,
  Offer,
  Dispute,
  EscrowOrderStatus
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@bcpros/lixi-prisma';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';

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
  @UseGuards(GqlJwtAuthGuard)
  async escrowOrder(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: id
        },
        include: {
          paymentMethod: true,
          offer: true,
          dispute: true,
          arbitratorAccount: true,
          buyerAccount: true,
          sellerAccount: true,
          moderatorAccount: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      //Check if there is a dispute and if the user is part of the dispute
      if (
        !result.dispute &&
        (result.moderatorAccount.id === account.id || result.arbitratorAccount.id === account.id)
      ) {
        throw new Error('User hasnt raised a dispute');
      }

      //Check if the user is part of the escrow order
      if (result.buyerAccount.id !== account.id && result.sellerAccount.id !== account.id) {
        // fix this
        throw new Error('User is not part of the escrow order');
      }

      return {
        ...result,
        escrowScript: result.escrowScript.toString('hex'),
        nonce: result.nonce
      };
    } catch (e) {
      this.logger.error(e);
    }
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
    const {
      postId,
      paymentMethodId,
      sellerId,
      arbitratorId,
      buyerId,
      moderatorId,
      amount,
      price,
      message,
      escrowScript,
      nonce
    } = data;

    const moderatorAccount = await this.prisma.account.findUnique({
      where: {
        id: moderatorId
      }
    });

    if (!moderatorAccount || moderatorAccount.role !== Role.MODERATOR) {
      throw new Error('Moderator not found');
    }

    const arbitratorAccount = await this.prisma.account.findUnique({
      where: {
        id: arbitratorId
      }
    });

    if (!arbitratorAccount || arbitratorAccount.role !== Role.ARBITRATOR) {
      throw new Error('Arbitrator not found');
    }

    const escrowOrder = await this.prisma.escrowOrder.create({
      data: {
        amount,
        price,
        message,
        escrowScript: Buffer.from(escrowScript, 'hex'),
        nonce: nonce,
        paymentMethod: {
          connect: {
            id: paymentMethodId
          }
        },
        sellerAccount: {
          connect: {
            id: sellerId
          }
        },
        buyerAccount: {
          connect: {
            id: buyerId
          }
        },
        arbitratorAccount: {
          connect: {
            id: arbitratorId
          }
        },
        moderatorAccount: {
          connect: {
            id: moderatorId
          }
        },
        offer: {
          connect: {
            postId: postId
          }
        }
      }
    });

    pubSub.publish('escrowOrderCreated', { escrowOrderCreated: escrowOrder });
    return escrowOrder;
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async updateEscrowOrderStatus(
    @AccountEntity() account: Account,
    @Args('orderId', { type: () => String }) orderId: string,
    @Args('status', { type: () => EscrowOrderStatus }) status: EscrowOrderStatus,
    @Args('txid', { type: () => String, nullable: true }) txid?: string
  ) {
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: orderId
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      if (status === EscrowOrderStatus.ACTIVE && account.id !== result.sellerAccountId) {
        throw new Error('Only seller can accept the order');
      }

      if (status === EscrowOrderStatus.ESCROW && account.id !== result.sellerAccountId) {
        throw new Error('Only seller can put the order in escrow');
      }

      if (
        status === EscrowOrderStatus.CANCEL &&
        account.id !== result.sellerAccountId &&
        account.id !== result.buyerAccountId
      ) {
        throw new Error('Only seller or buyer can cancel the order');
      }

      if (status === EscrowOrderStatus.ESCROW && _.isNil(txid)) {
        throw new Error('Txid is required for escrow status');
      }

      if (status === EscrowOrderStatus.COMPLETE && _.isNil(txid)) {
        throw new Error('Txid is required for complete status');
      }

      const dataToUpdate = {
        status,
        updatedAt: new Date()
      };

      switch (status) {
        case EscrowOrderStatus.ESCROW:
          _.set(dataToUpdate, 'escrowTxid', txid ?? null);
          break;
        case EscrowOrderStatus.COMPLETE:
          _.set(dataToUpdate, 'releaseTxid', txid ?? null);
          break;
        case EscrowOrderStatus.CANCEL:
          _.set(dataToUpdate, 'cancelTxid', txid ?? null);
          break;
      }

      const escrowOrder = await this.prisma.escrowOrder.update({
        where: {
          id: orderId
        },
        data: dataToUpdate
      });

      pubSub.publish('escrowOrderUpdated', { escrowOrderUpdated: escrowOrder });
      return escrowOrder;
    } catch (e) {
      this.logger.error(e);
    }
  }

  @ResolveField('arbitratorAccount', () => Account)
  async arbitratorAccount(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.account.findUnique({
      where: {
        id: escrowOrder.arbitratorAccount.id
      }
    });
  }

  @ResolveField('buyerAccount', () => Account)
  async buyerAccount(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.account.findUnique({
      where: {
        id: escrowOrder.buyerAccount.id
      }
    });
  }

  @ResolveField('sellerAccount', () => Account)
  async sellerAccount(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.account.findUnique({
      where: {
        id: escrowOrder.sellerAccount.id
      }
    });
  }

  @ResolveField('moderatorAccount', () => Account)
  async moderatorAccount(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.account.findUnique({
      where: {
        id: escrowOrder.moderatorAccount.id
      }
    });
  }

  @ResolveField('paymentMethod', () => PaymentMethod)
  async paymentMethod(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.paymentMethod.findUnique({
      where: {
        id: escrowOrder.paymentMethod.id
      }
    });
  }

  @ResolveField('offer', () => Offer)
  async offer(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.offer.findUnique({
      where: {
        postId: escrowOrder.offer.postId
      }
    });
  }

  @ResolveField('dispute', () => Dispute)
  async dispute(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.dispute.findUnique({
      where: {
        escrowOrderId: escrowOrder.id
      }
    });
  }
}
