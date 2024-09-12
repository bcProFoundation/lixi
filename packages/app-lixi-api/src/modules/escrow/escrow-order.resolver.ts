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
  EscrowOrderStatus,
  UpdateEscrowOrderInput,
  DisputeStatus
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@bcpros/lixi-prisma';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import { format } from 'node:util';
import { BOT } from 'src/utils/bot.constants';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram/telegram-bot.constants';
import { GqlThrottlerGuard } from '../auth/guards/gql-throttler.guard';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => EscrowOrder)
@UseFilters(GqlHttpExceptionFilter)
export class EscrowOrderResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    @I18n() private i18n: I18nService
  ) {}

  @Subscription(() => EscrowOrder)
  escrowOrderCreated() {
    return pubSub.asyncIterator('escrowOrderCreated');
  }

  @Query(() => Account)
  async getModeratorAccount() {
    try {
      return this.prisma.account.findFirst({
        where: {
          role: Role.MODERATOR
        }
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  @Query(() => Account)
  @UseGuards(GqlJwtAuthGuard)
  async getRandomArbitratorAccount(@AccountEntity() account: Account) {
    try {
      const accounts = await this.prisma.account.findMany({
        where: {
          AND: [
            {
              id: { not: account.id }
            },
            {
              role: Role.ARBITRATOR
            }
          ]
        }
      });

      if (accounts.length === 0) {
        throw new HttpException('No arbitrator found', HttpStatus.NOT_FOUND);
      }

      const randomIndex = Math.floor(Math.random() * accounts.length);
      return accounts[randomIndex];
    } catch (e) {
      this.logger.error(e);
    }
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
          moderatorAccount: true,
          escrowTxids: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      //Check if the user is part of the escrow order
      if (
        result.buyerAccount.id !== account.id &&
        result.sellerAccount.id !== account.id &&
        result.arbitratorAccount.id !== account.id &&
        result.moderatorAccount.id !== account.id
      ) {
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

  @Query(() => Boolean)
  @UseGuards(GqlJwtAuthGuard)
  @UseGuards(GqlThrottlerGuard)
  async userRequestTelegramChat(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
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
          moderatorAccount: true,
          escrowTxids: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      //Check if the user is part of the escrow order
      if (
        result.buyerAccount.id !== account.id &&
        result.sellerAccount.id !== account.id &&
        result.arbitratorAccount.id !== account.id &&
        result.moderatorAccount.id !== account.id
      ) {
        throw new Error('User is not part of the escrow order');
      }

      const { sellerAccount, buyerAccount } = result;
      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${result.id}`;

      if (account.id === result.sellerAccountId && buyerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.SELLER_REQUEST_CHAT, sellerAccount.telegramUsername, url);
        await this.bot.telegram.sendMessage(buyerAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

      if (account.id === result.buyerAccountId && sellerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.BUYER_REQUEST_CHAT, buyerAccount.telegramUsername, url);
        await this.bot.telegram.sendMessage(sellerAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

      return true;
    } catch (e) {
      this.logger.error(e);
    }
  }

  @Query(() => Boolean)
  @UseGuards(GqlJwtAuthGuard)
  @UseGuards(GqlThrottlerGuard)
  async arbiRequestTelegramChat(
    @AccountEntity() account: Account,
    @Args('requestChatPublicKey', { type: () => String }) requestChatPublicKey: string,
    @Args('escrowOrderId', { type: () => String }) escrowOrderId: string
  ) {
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: escrowOrderId
        },
        include: {
          paymentMethod: true,
          offer: true,
          dispute: true,
          arbitratorAccount: true,
          buyerAccount: true,
          sellerAccount: true,
          moderatorAccount: true,
          escrowTxids: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      //Check if the user is part of the escrow order
      if (
        result.buyerAccount.id !== account.id &&
        result.sellerAccount.id !== account.id &&
        result.arbitratorAccount.id !== account.id &&
        result.moderatorAccount.id !== account.id
      ) {
        throw new Error('User is not part of the escrow order');
      }

      const { moderatorAccount, arbitratorAccount, sellerAccount, buyerAccount } = result;
      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${result.id}`;

      if (account.id === result.arbitratorAccountId) {
        if (requestChatPublicKey === sellerAccount.publicKey && sellerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.ARBI_REQUEST_CHAT, arbitratorAccount.telegramUsername, url);
          await this.bot.telegram.sendMessage(sellerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown'
          });
        }

        if (requestChatPublicKey === buyerAccount.publicKey && buyerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.ARBI_REQUEST_CHAT, arbitratorAccount.telegramUsername, url);
          await this.bot.telegram.sendMessage(buyerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown'
          });
        }
      }

      if (account.id === result.moderatorAccountId) {
        if (requestChatPublicKey === sellerAccount.publicKey && sellerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.MOD_REQUEST_CHAT, moderatorAccount.telegramUsername, url);
          await this.bot.telegram.sendMessage(sellerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown'
          });
        }

        if (requestChatPublicKey === buyerAccount.publicKey && buyerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.MOD_REQUEST_CHAT, moderatorAccount.telegramUsername, url);
          await this.bot.telegram.sendMessage(buyerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown'
          });
        }
      }

      return true;
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
  @UseGuards(GqlJwtAuthGuard)
  async createEscrowOrder(@AccountEntity() account: Account, @Args('data') data: CreateEscrowOrderInput) {
    try {
      const {
        postId,
        paymentMethodId,
        sellerId,
        moderatorId,
        arbitratorId,
        amount,
        price,
        message,
        escrowScript,
        escrowAddress,
        nonce
      } = data;

      const buyerAccount = await this.prisma.account.findUnique({
        where: {
          id: account.id
        }
      });

      if (!buyerAccount) {
        throw new Error('Buyer not found');
      }

      //TODO: Uncomment when done testing
      // if (buyerAccount.id === sellerId) {
      //   throw new Error('Seller and buyer cannot be the same');
      // }

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
          escrowAddress,
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
              id: buyerAccount.id
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

      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${escrowOrder.id}`;

      if (buyerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.ORDER_CREATED, url);
        await this.bot.telegram.sendMessage(buyerAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

      if (arbitratorAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.ARBITRATOR_SELECTED, url);
        await this.bot.telegram.sendMessage(arbitratorAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

      if (moderatorAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.MODERATOR_SELECTED, url);
        await this.bot.telegram.sendMessage(moderatorAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

      pubSub.publish('escrowOrderCreated', { escrowOrderCreated: escrowOrder });
      return escrowOrder;
    } catch (e) {
      this.logger.error(e);
    }
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async updateEscrowOrderStatus(@AccountEntity() account: Account, @Args('data') data: UpdateEscrowOrderInput) {
    const { orderId, status, txid, value } = data;
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: orderId
        },
        include: {
          dispute: true,
          buyerAccount: true,
          sellerAccount: true,
          arbitratorAccount: true,
          moderatorAccount: true
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

      if (status === EscrowOrderStatus.COMPLETE && _.isNil(txid)) {
        throw new Error('Txid is required for complete status');
      }

      if (status === EscrowOrderStatus.ESCROW && result.status === EscrowOrderStatus.COMPLETE) {
        throw new Error('The order has completed');
      }

      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${result.id}`;
      const dataToUpdate = {
        status,
        updatedAt: new Date()
      };

      switch (status) {
        case EscrowOrderStatus.ACTIVE:
          txid &&
            value &&
            (await this.prisma.escrowTxId.create({
              data: {
                txid: txid,
                value: BigInt(value),
                escrowOrder: {
                  connect: {
                    id: orderId
                  }
                }
              }
            }));
          break;
        case EscrowOrderStatus.COMPLETE:
          _.set(dataToUpdate, 'releaseTxid', txid ?? null);

          if (result.sellerAccount.telegramId) {
            const formatReplied = format(BOT.MESSAGE.ORDER_COMPLETED, url);
            await this.bot.telegram.sendMessage(result.sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          if (result.buyerAccount.telegramId) {
            const formatReplied = format(BOT.MESSAGE.ORDER_COMPLETED, url);
            await this.bot.telegram.sendMessage(result.buyerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          break;
        case EscrowOrderStatus.CANCEL:
          _.set(dataToUpdate, 'returnTxid', txid ?? null);

          if (result.sellerAccount.telegramId) {
            const formatReplied = format(BOT.MESSAGE.ORDER_CANCELED, url);
            await this.bot.telegram.sendMessage(result.sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          if (result.buyerAccount.telegramId) {
            const formatReplied = format(BOT.MESSAGE.ORDER_CANCELED, url);
            await this.bot.telegram.sendMessage(result.buyerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          break;
      }

      const escrowOrder = await this.prisma.escrowOrder.update({
        where: {
          id: orderId
        },
        data: dataToUpdate
      });

      if (result.dispute) {
        await this.prisma.dispute.update({
          where: {
            id: result.dispute.id
          },
          data: {
            status: DisputeStatus.RESOLVED
          }
        });
      }

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

  @ResolveField('escrowTxids', () => Dispute)
  async escrowTxids(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.escrowTxId.findMany({
      where: {
        escrowOrderId: escrowOrder.id
      }
    });
  }
}
