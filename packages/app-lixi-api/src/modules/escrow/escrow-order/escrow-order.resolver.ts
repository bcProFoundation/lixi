import {
  Account,
  CreateEscrowOrderInput,
  EscrowOrder,
  PaymentMethod,
  Offer,
  Dispute,
  EscrowOrderStatus,
  UpdateEscrowOrderInput,
  DisputeStatus,
  EscrowTxid,
  TimelineItemConnection,
  BasicPaginationArgs,
  TimelineItem,
  IBasicPaginated,
  TIMELINE_TYPE
} from '@bcpros/lixi-models';
import { HttpException, HttpStatus, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@bcpros/lixi-prisma';
import { GqlJwtAuthGuard } from '../../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import EscrowOrderLoader from './escrow-order.loader';
import { VError } from 'verror';
import { EscrowOrderCacheService } from './escrow-order-cache.service';
import { TimelineItemService } from 'src/modules/timeline/timeline-item.service';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';
import { format } from 'node:util';
import { BOT } from 'src/utils/bot.constants';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../../telegram/telegram-bot.constants';
import { GqlThrottlerGuard } from '../../auth/guards/gql-throttler.guard';

@SkipThrottle()
@Resolver(() => EscrowOrder)
@UseFilters(GqlHttpExceptionFilter)
export class EscrowOrderResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly escrowOrderLoader: EscrowOrderLoader,
    private readonly escrowOrderCacheService: EscrowOrderCacheService,
    private readonly timelineItemService: TimelineItemService,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>
  ) {}

  @Query(() => Account)
  @UseGuards(GqlJwtAuthGuard)
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

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allEscrowOrderByAccount(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'escrowOrderStatus', type: () => EscrowOrderStatus }) escrowOrderStatus: EscrowOrderStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }
    const paginated = await this.escrowOrderCacheService.getPaginatedMyEscrowOrderTimelineByTime(
      account.id,
      escrowOrderStatus,
      first,
      after
    );
    const timelineIds = paginated.edges.map(item => item.cursor);
    // const timelines = await this.escrowOrderCacheService.getByIds(timelineIds);
    const timelines = await this.timelineItemService.getByIds(timelineIds, TIMELINE_TYPE.ESCROWORDER);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allEscrowOrderByOfferId(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerId', type: () => String }) offerId: string
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }
    const paginated = await this.escrowOrderCacheService.getPaginatedEscrowOrderByOfferIdTimelineByTime(
      offerId,
      first,
      after
    );
    const timelineIds = paginated.edges.map(item => item.cursor);
    // const timelines = await this.timelineItemService.getByIds(timelineIds);
    const timelines = await this.timelineItemService.getByIds(timelineIds, TIMELINE_TYPE.ESCROWORDER);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
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

      const sellerAccount = await this.prisma.account.findUnique({
        where: {
          id: sellerId
        }
      });

      if (!sellerAccount) {
        throw new Error('Seller not found');
      }

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

      if (sellerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.ORDER_CREATED, url);
        await this.bot.telegram.sendMessage(sellerAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        });
      }

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
      return escrowOrder;
    } catch (e) {
      this.logger.error(e);
    }
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async updateEscrowOrderStatus(@AccountEntity() account: Account, @Args('data') data: UpdateEscrowOrderInput) {
    const { orderId, status, txid, value, outIdx } = data;
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
          moderatorAccount: true,
          escrowTxids: true
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
        account.id !== result.buyerAccountId &&
        account.id !== result.arbitratorAccountId &&
        account.id !== result.moderatorAccountId
      ) {
        throw new Error('You do not have the authority to cancel order');
      }

      if (status === EscrowOrderStatus.COMPLETE && _.isNil(txid)) {
        throw new Error('Txid is required for complete status');
      }

      if (status === EscrowOrderStatus.ESCROW && result.status === EscrowOrderStatus.COMPLETE) {
        throw new Error('The order has completed');
      }

      const isArbMod = account.id === result?.arbitratorAccountId || account.id === result?.moderatorAccountId;
      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${result.id}`;
      const dataToUpdate = {
        status,
        updatedAt: new Date()
      };

      switch (status) {
        case EscrowOrderStatus.ACTIVE:
          txid &&
            value &&
            !_.isNil(outIdx) &&
            (await this.prisma.escrowTxId.create({
              data: {
                txid: txid,
                value: BigInt(value),
                outIdx,
                escrowOrder: {
                  connect: {
                    id: orderId
                  }
                }
              }
            }));
          break;
        case EscrowOrderStatus.ESCROW:
          txid &&
            value &&
            (await this.prisma.escrowTxId.create({
              data: {
                txid: txid,
                value: BigInt(value),
                outIdx: 0,
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
            const formatReplied = isArbMod
              ? format(BOT.MESSAGE.ORDER_RELEASE_BY_ARBMOD_SELLER, url)
              : format(BOT.MESSAGE.ORDER_COMPLETED, url);
            await this.bot.telegram.sendMessage(result.sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          if (result.buyerAccount.telegramId) {
            const formatReplied = isArbMod
              ? format(BOT.MESSAGE.ORDER_RELEASE_BY_ARBMOD_BUYER, url)
              : format(BOT.MESSAGE.ORDER_COMPLETED, url);
            await this.bot.telegram.sendMessage(result.buyerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          break;
        case EscrowOrderStatus.CANCEL:
          _.set(dataToUpdate, 'returnTxid', txid ?? null);

          if (result.sellerAccount.telegramId) {
            const formatReplied = isArbMod
              ? format(BOT.MESSAGE.ORDER_RETURN_BY_ARBMOD_SELLER, url)
              : format(BOT.MESSAGE.ORDER_CANCELED, url);
            await this.bot.telegram.sendMessage(result.sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown'
            });
          }

          if (result.buyerAccount.telegramId) {
            const formatReplied = isArbMod
              ? format(BOT.MESSAGE.ORDER_RETURN_BY_ARBMOD_BUYER, url)
              : format(BOT.MESSAGE.ORDER_CANCELED, url);
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

      return escrowOrder;
    } catch (e) {
      this.logger.error(e);
    }
  }

  @ResolveField('arbitratorAccount', () => Account)
  async arbitratorAccount(@Parent() escrowOrder: EscrowOrder) {
    return escrowOrder.arbitratorAccountId
      ? this.escrowOrderLoader.batchAccounts.load(escrowOrder.arbitratorAccountId)
      : null;
  }

  @ResolveField('buyerAccount', () => Account)
  async buyerAccount(@Parent() escrowOrder: EscrowOrder) {
    return escrowOrder.buyerAccountId ? this.escrowOrderLoader.batchAccounts.load(escrowOrder.buyerAccountId) : null;
  }

  @ResolveField('sellerAccount', () => Account)
  async sellerAccount(@Parent() escrowOrder: EscrowOrder) {
    return escrowOrder.sellerAccountId ? this.escrowOrderLoader.batchAccounts.load(escrowOrder.sellerAccountId) : null;
  }

  @ResolveField('moderatorAccount', () => Account)
  async moderatorAccount(@Parent() escrowOrder: EscrowOrder) {
    return escrowOrder.moderatorAccountId
      ? this.escrowOrderLoader.batchAccounts.load(escrowOrder.moderatorAccountId)
      : null;
  }

  @ResolveField('paymentMethod', () => PaymentMethod)
  async paymentMethod(@Parent() escrowOrder: EscrowOrder) {
    return this.escrowOrderLoader.batchPaymentMethods.load(escrowOrder.paymentMethodId);
  }

  @ResolveField('offer', () => Offer)
  async offer(@Parent() escrowOrder: EscrowOrder) {
    return this.escrowOrderLoader.batchOffers.load(escrowOrder.offerId);
  }

  @ResolveField('dispute', () => Dispute)
  async dispute(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.dispute.findUnique({
      where: {
        escrowOrderId: escrowOrder.id
      }
    });
  }

  @ResolveField('escrowTxids', () => EscrowTxid)
  async escrowTxids(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.escrowTxId.findMany({
      where: {
        escrowOrderId: escrowOrder.id
      }
    });
  }
}
