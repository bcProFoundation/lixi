import {
  Account,
  CreateEscrowOrderInput,
  EscrowOrder,
  PaymentMethod,
  Offer,
  Dispute,
  EscrowOrderStatus,
  UpdateEscrowOrderInput,
  EscrowTxid,
  TimelineItemConnection,
  BasicPaginationArgs,
  TimelineItem,
  IBasicPaginated,
  TIMELINE_TYPE,
  UtxoInNode,
  UtxoInNodeInput,
  coinInfo,
  COIN,
  EscrowOrderConnection,
  PaginationArgs,
  UpdateEscrowOrderSignatoryInput,
  EscrowOrderAction,
  BankInfo,
  PAYMENT_METHOD
} from '@bcpros/lixi-models';
import { HttpException, HttpStatus, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { OfferStatus, OfferType, Role } from '@bcpros/lixi-prisma';
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
import { template } from 'src/utils/stringTemplate';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { NotificationGateway } from 'src/common/modules/notifications/notification.gateway';
import { DisputeCacheService } from '../dispute/dispute-cache.service';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { ConfigService } from '@nestjs/config';
import { KEY_BANK_INFO } from 'src/utils/escrow/cache-key.constants';

@SkipThrottle()
@Resolver(() => EscrowOrder)
@UseFilters(GqlHttpExceptionFilter)
export class EscrowOrderResolver {
  private keyUtxosInProcess = 'utxosInProcess:{{accountId}}';

  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly config: ConfigService,
    private readonly escrowOrderLoader: EscrowOrderLoader,
    private readonly escrowOrderCacheService: EscrowOrderCacheService,
    private readonly disputeCacheService: DisputeCacheService,
    private readonly timelineItemService: TimelineItemService,
    private notificationGateway: NotificationGateway,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    @InjectRedis() private readonly redis: Redis
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
  async getRandomArbitratorAccount(@AccountEntity() account: Account, @Args('offerId') offerId: string) {
    try {
      const offer = await this.prisma.post.findUnique({
        where: {
          id: offerId
        },
        include: {
          account: true
        }
      });

      if (!offer) {
        throw new Error('Offer not found');
      }

      const accounts = await this.prisma.account.findMany({
        where: {
          AND: [
            {
              id: { not: account.id }
            },
            {
              id: { not: offer.account.id }
            },
            {
              role: Role.ARBITRATOR
            }
          ]
        }
      });

      if (accounts.length === 0) {
        throw new Error('No arbitrator found');
      }

      const randomIndex = Math.floor(Math.random() * accounts.length);
      return accounts[randomIndex];
    } catch (e: any) {
      throw new Error(e);
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
        releaseSignatory: result.releaseSignatory ? result.releaseSignatory.toString('hex') : null,
        returnSignatory: result.returnSignatory ? result.returnSignatory.toString('hex') : null,
        signatoryOwnerHash160: result.signatoryOwnerHash160 ? result.signatoryOwnerHash160.toString('hex') : null,
        nonce: result.nonce
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Query(() => Boolean)
  @UseGuards(GqlJwtAuthGuard)
  @UseGuards(GqlThrottlerGuard)
  @SkipThrottle({ default: false })
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
      const sellerTelegramUsername = sellerAccount.telegramUsername!.replace(/_/g, '\\_');
      const buyerTelegramUsername = buyerAccount.telegramUsername!.replace(/_/g, '\\_');

      if (account.id === result.sellerAccountId && buyerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.SELLER_REQUEST_CHAT, sellerTelegramUsername);
        await this.bot.telegram
          .sendMessage(buyerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Web App',
                    url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      if (account.id === result.buyerAccountId && sellerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.BUYER_REQUEST_CHAT, buyerTelegramUsername);
        await this.bot.telegram
          .sendMessage(sellerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Web App',
                    url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      return true;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Query(() => Boolean)
  @UseGuards(GqlJwtAuthGuard)
  @UseGuards(GqlThrottlerGuard)
  @SkipThrottle({ default: false })
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
      const arbTelegramUsername = arbitratorAccount.telegramUsername!.replace(/_/g, '\\_');
      const modTelegramUsername = moderatorAccount.telegramUsername!.replace(/_/g, '\\_');

      if (account.id === result.arbitratorAccountId) {
        if (requestChatPublicKey === sellerAccount.publicKey && sellerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.ARBI_REQUEST_CHAT, arbTelegramUsername);
          await this.bot.telegram
            .sendMessage(sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrderId}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });
        }

        if (requestChatPublicKey === buyerAccount.publicKey && buyerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.ARBI_REQUEST_CHAT, arbTelegramUsername);
          await this.bot.telegram
            .sendMessage(buyerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrderId}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });
        }
      }

      if (account.id === result.moderatorAccountId) {
        if (requestChatPublicKey === sellerAccount.publicKey && sellerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.MOD_REQUEST_CHAT, modTelegramUsername);
          await this.bot.telegram
            .sendMessage(sellerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrderId}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });
        }

        if (requestChatPublicKey === buyerAccount.publicKey && buyerAccount.telegramId) {
          const formatReplied = format(BOT.MESSAGE.MOD_REQUEST_CHAT, modTelegramUsername);
          await this.bot.telegram
            .sendMessage(buyerAccount.telegramId, formatReplied, {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrderId}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });
        }
      }

      return true;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Query(() => EscrowOrderConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allEscrowOrderByAccount(
    @AccountEntity() account: Account,
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'escrowOrderStatus', type: () => EscrowOrderStatus }) escrowOrderStatus: EscrowOrderStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    //if escrow order status is complete or cancel, return all escrow orders with status complete or cancel
    if (escrowOrderStatus === EscrowOrderStatus.COMPLETE || escrowOrderStatus === EscrowOrderStatus.CANCEL) {
      const escrowOrders = await findManyCursorConnection(
        async args => {
          const result = await this.prisma.escrowOrder.findMany({
            include: {
              offer: true,
              paymentMethod: true,
              moderatorAccount: true,
              arbitratorAccount: true,
              sellerAccount: true,
              buyerAccount: true
            },
            where: {
              AND: [
                {
                  OR: [
                    {
                      buyerAccountId: account.id
                    },
                    {
                      sellerAccountId: account.id
                    }
                  ]
                },
                {
                  status: {
                    in: [EscrowOrderStatus.COMPLETE, EscrowOrderStatus.CANCEL]
                  }
                }
              ]
            },
            orderBy: {
              updatedAt: 'desc'
            },
            ...args
          });

          return result.map(item => ({
            ...item,
            escrowScript: item.escrowScript.toString('hex'),
            releaseSignatory: item.releaseSignatory ? item.releaseSignatory.toString('hex') : null,
            returnSignatory: item.returnSignatory ? item.returnSignatory.toString('hex') : null,
            signatoryOwnerHash160: item.signatoryOwnerHash160 ? item.signatoryOwnerHash160.toString('hex') : null
          }));
        },
        () =>
          this.prisma.escrowOrder.count({
            where: {
              status: escrowOrderStatus,
              OR: [
                {
                  buyerAccountId: account.id
                },
                {
                  sellerAccountId: account.id
                }
              ]
            }
          }),
        { first, last, before, after }
      );

      return escrowOrders;
    }

    const escrowOrders = await findManyCursorConnection(
      async args => {
        const result = await this.prisma.escrowOrder.findMany({
          include: {
            offer: true,
            paymentMethod: true,
            moderatorAccount: true,
            arbitratorAccount: true,
            sellerAccount: true,
            buyerAccount: true
          },
          where: {
            status: escrowOrderStatus,
            OR: [
              {
                buyerAccountId: account.id
              },
              {
                sellerAccountId: account.id
              }
            ]
          },
          orderBy: {
            updatedAt: 'desc'
          },
          ...args
        });

        return result.map(item => ({
          ...item,
          escrowScript: item.escrowScript.toString('hex'),
          releaseSignatory: item.releaseSignatory ? item.releaseSignatory.toString('hex') : null,
          returnSignatory: item.returnSignatory ? item.returnSignatory.toString('hex') : null,
          signatoryOwnerHash160: item.signatoryOwnerHash160 ? item.signatoryOwnerHash160.toString('hex') : null
        }));
      },
      () =>
        this.prisma.escrowOrder.count({
          where: {
            status: escrowOrderStatus,
            OR: [
              {
                buyerAccountId: account.id
              },
              {
                sellerAccountId: account.id
              }
            ]
          }
        }),
      { first, last, before, after }
    );

    return escrowOrders;
  }

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allEscrowOrderByOfferId(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerId', type: () => String }) offerId: string,
    @Args({ name: 'escrowOrderStatus', type: () => EscrowOrderStatus }) escrowOrderStatus: EscrowOrderStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }
    const paginated = await this.escrowOrderCacheService.getPaginatedEscrowOrderByOfferIdTimelineByTime(
      offerId,
      escrowOrderStatus,
      account?.id,
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
        offerAccountId,
        moderatorId,
        arbitratorId,
        amount,
        price,
        message,
        escrowScript,
        escrowAddress,
        nonce,
        buyerDepositTx,
        utxoInProcess,
        amountCoinOrCurrency,
        bankInfoInput
      } = data;

      const offer = await this.prisma.offer.findUnique({
        where: {
          postId: postId
        }
      });

      if (offer && offer.status === OfferStatus.ARCHIVE) {
        throw new Error('Offer is no longer available');
      }

      const offerAccount = await this.prisma.account.findUnique({
        where: {
          id: offerAccountId
        }
      });

      if (!offerAccount) {
        throw new Error('Offer-account not found');
      }

      if (!offerAccount.telegramId) {
        throw new Error(`Offer-account doesn't connect to Telegram account`);
      }

      const orderAccount = await this.prisma.account.findUnique({
        where: {
          id: account.id
        }
      });

      if (!orderAccount) {
        throw new Error('Order-account not found');
      }

      if (!orderAccount.telegramId) {
        throw new Error(`Order-account doesn't connect to Telegram account`);
      }

      if (offerAccount.id === orderAccount.id) {
        throw new Error('Seller and buyer cannot be the same');
      }

      const moderatorAccount = await this.prisma.account.findUnique({
        where: {
          id: moderatorId
        }
      });

      if (!moderatorAccount || moderatorAccount.role !== Role.MODERATOR) {
        throw new Error('Moderator not found');
      }

      if (!moderatorAccount.telegramId) {
        throw new Error(`Moderator doesn't connect to Telegram account`);
      }

      if (moderatorAccount.id === account.id) {
        throw new Error(`Moderator can not create an escrow order`);
      }

      const arbitratorAccount = await this.prisma.account.findUnique({
        where: {
          id: arbitratorId
        }
      });

      if (!arbitratorAccount || arbitratorAccount.role !== Role.ARBITRATOR) {
        throw new Error('Arbitrator not found');
      }

      if (!arbitratorAccount.telegramId) {
        throw new Error(`Arbitrator doesn't connect to Telegram account`);
      }

      if (offerAccount.id === arbitratorAccount.id || offerAccount.id === moderatorAccount.id) {
        throw new Error('Offer-account cannot be the same as arbitrator or moderator');
      }

      if (orderAccount.id === arbitratorAccount.id || orderAccount.id === moderatorAccount.id) {
        throw new Error('Order-account cannot be the same as arbitrator or moderator');
      }

      const escrowOrder = await this.prisma.escrowOrder.create({
        data: {
          amount,
          amountCoinOrCurrency,
          price,
          message,
          escrowAddress,
          escrowScript: Buffer.from(escrowScript, 'hex'),
          nonce: nonce,
          buyerDepositTx: buyerDepositTx,
          bankInfo:
            paymentMethodId === PAYMENT_METHOD.BANK_TRANSFER || paymentMethodId === PAYMENT_METHOD.PAYMENT_APP
              ? {
                  create: {
                    bankName: bankInfoInput?.bankName ?? null,
                    accountNameBank: bankInfoInput?.bankName ? bankInfoInput?.accountNameBank : '',
                    accountNumberBank: bankInfoInput?.bankName ? bankInfoInput?.accountNumberBank : '',
                    appName: bankInfoInput?.appName ?? null,
                    accountNameApp: bankInfoInput?.appName ? bankInfoInput?.accountNameApp : '',
                    accountNumberApp: bankInfoInput?.appName ? bankInfoInput?.accountNumberApp : ''
                  }
                }
              : undefined,
          paymentMethod: {
            connect: {
              id: paymentMethodId
            }
          },
          //- BuyOffer:
          //  + offerAccount is buyer
          //  + orderAccount is seller

          // - SellOffer:
          //  + offerAccount is seller
          //  + orderAccount is buyer
          sellerAccount: {
            connect: {
              id: offer?.type === OfferType.BUY ? orderAccount.id : offerAccount.id
            }
          },
          buyerAccount: {
            connect: {
              id: offer?.type === OfferType.BUY ? offerAccount.id : orderAccount.id
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
        },
        include: {
          offer: {
            select: {
              telegramMessageId: true,
              localCurrency: true,
              coinPayment: true,
              message: true
            }
          }
        }
      });

      //add utxo in list UtxoInProcess
      if (buyerDepositTx && utxoInProcess) {
        const keyUtxos = template(this.keyUtxosInProcess, { accountId: account.id });
        await this.redis.hset(
          keyUtxos,
          `${utxoInProcess.txid}:${utxoInProcess.outIdx}`,
          Buffer.from(encode(utxoInProcess))
        );
      }

      // add bank-info of account to cache
      if (paymentMethodId === PAYMENT_METHOD.BANK_TRANSFER || paymentMethodId === PAYMENT_METHOD.PAYMENT_APP) {
        const existData = await this.redis.hgetBuffer(KEY_BANK_INFO, account.id.toString());
        if (!existData) {
          await this.redis.hset(KEY_BANK_INFO, account.id, Buffer.from(encode(data.bankInfoInput)));
        } else {
          const parsed = decode(existData) as BankInfo;
          // Filter out any fields that are null or undefined
          const filteredPatch = Object.fromEntries(
            Object.entries(data.bankInfoInput ?? {}).filter(([_, val]) => val !== null && val !== undefined)
          );
          const newBankInfoData = {
            ...parsed,
            ...filteredPatch
          };
          await this.redis.hset(KEY_BANK_INFO, account.id, Buffer.from(encode(newBankInfoData)));
        }
      }

      if (offerAccount.telegramId && orderAccount.telegramId) {
        const replied = buyerDepositTx
          ? BOT.MESSAGE.ORDER_CREATED + `Buyer Deposit: %s XEC`
          : BOT.MESSAGE.ORDER_CREATED;
        const formatReplied = format(
          replied,
          escrowOrder.amount.toLocaleString('en-US'),
          orderAccount.telegramUsername!.replace(/_/g, '\\_'),
          escrowOrder.offer.message,
          escrowOrder.amountCoinOrCurrency.toLocaleString('en-US'),
          escrowOrder.offer.coinPayment ?? escrowOrder.offer.localCurrency ?? 'XEC',
          escrowOrder.message,
          buyerDepositTx
            ? (() => {
                const fee1Percent = parseFloat((escrowOrder.amount / 100).toFixed(2));
                const dustXEC = coinInfo[COIN.XEC].dustSats / Math.pow(10, coinInfo[COIN.XEC].cashDecimals);

                return Math.max(fee1Percent, dustXEC);
              })()
            : ''
        );

        //send to offer-acocunt
        await this.bot.telegram
          .sendMessage(offerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_parameters: {
              message_id: escrowOrder.offer.telegramMessageId ? parseInt(escrowOrder.offer.telegramMessageId!) : -1,
              allow_sending_without_reply: true
            },
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Web App',
                    url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrder.id}`
                  }
                ]
              ]
            }
          })
          .then(async res => {
            await this.prisma.escrowOrder.update({
              where: {
                id: escrowOrder.id
              },
              data: {
                sellerTelegramMessageId: res.message_id
              }
            });

            this.notificationGateway.recievedEscrowOrder(offerAccount.address);
          })
          .catch(e => {
            this.logger.error(e);
          });

        //Send to order-account
        await this.bot.telegram
          .sendMessage(orderAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Web App',
                    url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${escrowOrder.id}`
                  }
                ]
              ]
            }
          })
          .then(async res => {
            await this.prisma.escrowOrder.update({
              where: {
                id: escrowOrder.id
              },
              data: {
                buyerTelegramMessageId: res.message_id
              }
            });
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      return escrowOrder;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async updateEscrowOrderSignatory(
    @AccountEntity() account: Account,
    @Args('data') data: UpdateEscrowOrderSignatoryInput
  ) {
    const { orderId, action, signatory, socketId, sellerDonateAmount, buyerDonateAmount, signatoryOwnerHash160 } = data;
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: orderId
        },
        include: {
          sellerAccount: true,
          buyerAccount: true,
          arbitratorAccount: true,
          moderatorAccount: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      if (
        account.id !== result.sellerAccountId &&
        account.id !== result.buyerAccountId &&
        account.id !== result.arbitratorAccountId &&
        account.id !== result.moderatorAccountId
      ) {
        throw new Error('You are not allowed to update order signatory');
      }

      switch (action) {
        case EscrowOrderAction.RELEASE:
          if (result.status !== EscrowOrderStatus.ESCROW) {
            throw new Error('Escrow order is not in escrow status');
          }

          if (result.releaseSignatory) {
            throw new Error('Release signatory already set');
          }

          await this.prisma.escrowOrder.update({
            where: {
              id: orderId
            },
            data: {
              releaseSignatory: Buffer.from(signatory, 'hex'),
              updatedAt: new Date(),
              sellerDonateAmount: sellerDonateAmount ?? null,
              signatoryOwnerHash160: Buffer.from(signatoryOwnerHash160, 'hex')
            }
          });

          this.notificationGateway.publishEscrowOrderStatus(orderId, {
            escrowOrderId: orderId,
            escrowOrder: {
              releaseSignatory: signatory,
              sellerDonateAmount,
              signatoryOwnerHash160
            },
            socketId: socketId ?? '',
            escrowOrderAction: EscrowOrderAction.RELEASE
          });

          //send to buyer
          await this.bot.telegram
            .sendMessage(result.buyerAccount.telegramId!, format(BOT.MESSAGE.ORDER_RELEASED), {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_parameters: {
                message_id: result.buyerTelegramMessageId!,
                allow_sending_without_reply: true
              },
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });

          break;
        case EscrowOrderAction.RETURN:
          if (result.status !== EscrowOrderStatus.ESCROW) {
            throw new Error('Escrow order is not in escrow status');
          }

          if (result.returnSignatory) {
            throw new Error('Return signatory already set');
          }

          await this.prisma.escrowOrder.update({
            where: {
              id: orderId
            },
            data: {
              returnSignatory: Buffer.from(signatory, 'hex'),
              updatedAt: new Date(),
              buyerDonateAmount: buyerDonateAmount ?? null,
              signatoryOwnerHash160: Buffer.from(signatoryOwnerHash160, 'hex')
            }
          });

          this.notificationGateway.publishEscrowOrderStatus(orderId, {
            escrowOrderId: orderId,
            escrowOrder: {
              returnSignatory: signatory,
              buyerDonateAmount,
              signatoryOwnerHash160
            },
            socketId: socketId ?? '',
            escrowOrderAction: EscrowOrderAction.RETURN
          });

          //send to seller
          await this.bot.telegram
            .sendMessage(result.sellerAccount.telegramId!, format(BOT.MESSAGE.ORDER_RETURNED), {
              parse_mode: 'Markdown',
              protect_content: true,
              reply_parameters: {
                message_id: result.sellerTelegramMessageId!,
                allow_sending_without_reply: true
              },
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Open Web App',
                      url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                    }
                  ]
                ]
              }
            })
            .catch(e => {
              this.logger.error(e);
            });

          break;
        default:
          throw new Error('Invalid action');
      }

      return result;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async updateEscrowOrderStatus(@AccountEntity() account: Account, @Args('data') data: UpdateEscrowOrderInput) {
    const {
      orderId,
      status,
      txid,
      value,
      outIdx,
      utxoInNodeOfBuyer,
      socketId,
      sellerDonateAmount,
      buyerDonateAmount,
      amount,
      price
    } = data;
    try {
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: orderId
        },
        include: {
          dispute: true,
          offer: true,
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

      if (status === EscrowOrderStatus.CANCEL && result.status === EscrowOrderStatus.ESCROW && !txid) {
        throw new Error('Cannot cancel an escrowed order without returning funds!');
      }

      if (status === EscrowOrderStatus.COMPLETE && _.isNil(txid)) {
        throw new Error('Txid is required for complete status');
      }

      if (result.status === EscrowOrderStatus.COMPLETE) {
        throw new Error('The order has completed');
      }

      if (result.status === EscrowOrderStatus.CANCEL) {
        throw new Error('The order has cancelled');
      }

      //remove utxo of buyer if have
      if (utxoInNodeOfBuyer) {
        const keyUtxos = template(this.keyUtxosInProcess, { accountId: result.buyerAccountId });
        await this.redis.hdel(keyUtxos, `${utxoInNodeOfBuyer.txid}:${utxoInNodeOfBuyer.outIdx}`);
      }

      const isSeller = account.id === result?.sellerAccountId;
      const isArbiMod = account.id === result?.arbitratorAccountId || account.id === result?.moderatorAccountId;
      const dataToUpdate = {
        status,
        updatedAt: new Date(),
        sellerDonateAmount: result.sellerDonateAmount ? result.sellerDonateAmount : sellerDonateAmount,
        buyerDonateAmount: result.buyerDonateAmount ? result.buyerDonateAmount : buyerDonateAmount,
        amount: amount ? amount : result.amount,
        price: price ? price : result.price
      };

      switch (status) {
        case EscrowOrderStatus.ESCROW:
          txid &&
            value &&
            !_.isNil(outIdx) &&
            (await this.prisma.escrowTxId.create({
              data: {
                txid: txid,
                value: BigInt(value),
                outIdx: outIdx,
                escrowOrder: {
                  connect: {
                    id: orderId
                  }
                }
              }
            }));

          this.notificationGateway.publishEscrowOrderStatus(orderId, {
            escrowOrderId: orderId,
            escrowOrder: {
              txid,
              value,
              outIdx,
              updatedAt: dataToUpdate.updatedAt,
              status: EscrowOrderStatus.ESCROW
            },
            socketId: socketId ?? ''
          });

          await this.escrowOrderCacheService.updateEscrowOrderByOfferIdCache(
            result.sellerAccount.id, //update cache offer from seller
            orderId,
            dataToUpdate.updatedAt,
            result.offerId,
            result.status as EscrowOrderStatus,
            EscrowOrderStatus.ESCROW
          );

          //notify for buyer
          if (result.buyerAccount.telegramId) {
            const formatReplied = format(BOT.MESSAGE.ORDER_ESCROW);
            await this.bot.telegram
              .sendMessage(result.buyerAccount.telegramId, formatReplied, {
                parse_mode: 'Markdown',
                protect_content: true,
                reply_parameters: {
                  message_id: result.buyerTelegramMessageId!
                },
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Open Web App',
                        url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${orderId}`
                      }
                    ]
                  ]
                }
              })
              .catch(e => {
                this.logger.error(e);
              });
          }

          //pin the message for seller
          if (result.sellerAccount.telegramId && result.sellerTelegramMessageId) {
            await this.bot.telegram
              .pinChatMessage(result.sellerAccount.telegramId!, result.sellerTelegramMessageId)
              .catch(e => this.logger.error(e));
          }

          break;
        case EscrowOrderStatus.COMPLETE:
          _.set(dataToUpdate, 'releaseTxid', txid ?? null);

          if (result.sellerAccount.telegramId && result.buyerAccount.telegramId) {
            const formatReplied = isArbiMod
              ? format(BOT.MESSAGE.ORDER_RELEASE_BY_ARBMOD_SELLER)
              : format(BOT.MESSAGE.ORDER_COMPLETED);

            //send to seller
            await this.bot.telegram
              .sendMessage(result.sellerAccount.telegramId, formatReplied, {
                parse_mode: 'Markdown',
                protect_content: true,
                reply_parameters: {
                  message_id: result.sellerTelegramMessageId!,
                  allow_sending_without_reply: true
                }
              })
              .then(async res => {
                await this.bot.telegram
                  .unpinChatMessage(result.sellerAccount.telegramId!, result.sellerTelegramMessageId!)
                  .catch(e => {
                    this.logger.error(e);
                  });
              })
              .catch(e => {
                this.logger.error(e);
              });

            //send to buyer
            await this.bot.telegram
              .sendMessage(result.buyerAccount.telegramId, formatReplied, {
                parse_mode: 'Markdown',
                protect_content: true,
                reply_parameters: {
                  message_id: result.buyerTelegramMessageId!,
                  allow_sending_without_reply: true
                }
              })
              .catch(e => {
                this.logger.error(e);
              });
          }

          this.notificationGateway.publishEscrowOrderStatus(orderId, {
            escrowOrderId: orderId,
            escrowOrder: {
              txid,
              updatedAt: dataToUpdate.updatedAt,
              status: EscrowOrderStatus.COMPLETE
            },
            socketId: socketId ?? ''
          });

          await this.escrowOrderCacheService.updateMyEscrowOrderTimelineCache(
            orderId,
            dataToUpdate.updatedAt,
            result.buyerAccount.id
          );

          await this.escrowOrderCacheService.updateEscrowOrderByOfferIdCache(
            result.sellerAccount.id,
            orderId,
            dataToUpdate.updatedAt,
            result.offerId,
            result.status as EscrowOrderStatus,
            EscrowOrderStatus.COMPLETE
          );

          break;
        case EscrowOrderStatus.CANCEL:
          _.set(dataToUpdate, 'returnTxid', txid ?? null);

          //buyer cancel => notif for seller (always notif if arb cancel)
          if (result.sellerAccount.telegramId && (!isSeller || isArbiMod)) {
            const formatReplied = isArbiMod
              ? format(BOT.MESSAGE.ORDER_RETURN_BY_ARBMOD_SELLER)
              : format(BOT.MESSAGE.ORDER_CANCELED);

            await this.bot.telegram
              .sendMessage(result.sellerAccount.telegramId, formatReplied, {
                parse_mode: 'Markdown',
                protect_content: true,
                reply_parameters: {
                  message_id: result.sellerTelegramMessageId!,
                  allow_sending_without_reply: true
                },
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Open Web App',
                        url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                      }
                    ]
                  ]
                }
              })
              .catch(e => {
                this.logger.error(e);
              });
          }

          //seller cancel => notif for buyer
          if (result.buyerAccount.telegramId && (isSeller || isArbiMod)) {
            const formatReplied = isArbiMod
              ? format(BOT.MESSAGE.ORDER_RETURN_BY_ARBMOD_BUYER)
              : format(BOT.MESSAGE.ORDER_DECLINED);

            await this.bot.telegram
              .sendMessage(result.buyerAccount.telegramId, formatReplied, {
                parse_mode: 'Markdown',
                protect_content: true,
                reply_parameters: {
                  message_id: result.buyerTelegramMessageId!,
                  allow_sending_without_reply: true
                }
              })
              .catch(e => {
                this.logger.error(e);
              });
          }

          //unpin for seller
          await this.bot.telegram
            .unpinChatMessage(result.sellerAccount.telegramId!, result.sellerTelegramMessageId!)
            .catch(e => {
              this.logger.error(e);
            });

          this.notificationGateway.publishEscrowOrderStatus(orderId, {
            escrowOrderId: orderId,
            escrowOrder: {
              txid,
              updatedAt: dataToUpdate.updatedAt,
              status: EscrowOrderStatus.CANCEL
            },
            socketId: socketId ?? ''
          });

          await this.escrowOrderCacheService.updateMyEscrowOrderTimelineCache(
            orderId,
            dataToUpdate.updatedAt,
            result.buyerAccount.id
          );

          await this.escrowOrderCacheService.updateEscrowOrderByOfferIdCache(
            result.sellerAccount.id,
            orderId,
            dataToUpdate.updatedAt,
            result.offerId,
            result.status as EscrowOrderStatus,
            EscrowOrderStatus.CANCEL
          );

          break;
      }

      const escrowOrder = await this.prisma.escrowOrder.update({
        where: {
          id: orderId
        },
        data: dataToUpdate
      });

      return escrowOrder;
    } catch (e: any) {
      throw new Error(e);
    }
  }

  @Mutation(() => EscrowOrder)
  @UseGuards(GqlJwtAuthGuard)
  async markAsPaidOrder(@AccountEntity() account: Account, @Args('data') data: UpdateEscrowOrderInput) {
    try {
      if (!account) {
        throw new Error('Account not found');
      }
      const result = await this.prisma.escrowOrder.findUnique({
        where: {
          id: data.orderId
        },
        include: {
          sellerAccount: true,
          buyerAccount: true,
          arbitratorAccount: true,
          moderatorAccount: true
        }
      });

      if (!result) {
        throw new Error('Escrow order not found');
      }

      //update escrow order
      await this.prisma.escrowOrder.update({
        where: {
          id: data.orderId
        },
        data: {
          markAsPaid: true
        }
      });

      // notify for seller (buyOffer)
      if (result?.sellerAccount?.telegramId) {
        const formatReplied = format(BOT.MESSAGE.ORDER_MARK_AS_PAID_SELLER);
        await this.bot.telegram.sendMessage(result.sellerAccount.telegramId, formatReplied, {
          parse_mode: 'Markdown',
          protect_content: true,
          reply_parameters: {
            message_id: result.sellerTelegramMessageId!,
            allow_sending_without_reply: true
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Open Web App',
                  url: `${this.config.get('LOCAL_ECASH_URL')}/order-detail?id=${result.id}`
                }
              ]
            ]
          }
        });
      }

      return result;
    } catch (e: any) {
      this.logger.error(e);
    }
  }

  @Mutation(() => [UtxoInNode])
  @UseGuards(GqlJwtAuthGuard)
  async filterUtxos(
    @AccountEntity() account: Account,
    @Args('data', { type: () => [UtxoInNodeInput] }) data: UtxoInNodeInput[]
  ) {
    try {
      if (data.length === 0) return [];

      const keyUtxos = template(this.keyUtxosInProcess, { accountId: account?.id });
      const existsKey = await this.redis.exists([keyUtxos]);
      if (!existsKey) return data;

      const keysUtxos = data.map(item => {
        return `${item.txid}:${item.outIdx}`;
      });
      const utxosInProcess = await this.redis.hmgetBuffer(keyUtxos, ...keysUtxos);

      //choose utxos don't store
      const filteredUtxos = data.filter((key, index) => utxosInProcess[index] === null);
      return filteredUtxos;
    } catch (e: any) {
      throw new Error(e);
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

  @ResolveField('bankInfo', () => Dispute)
  async bankInfo(@Parent() escrowOrder: EscrowOrder) {
    return this.prisma.bankInfo.findUnique({
      where: {
        orderId: escrowOrder.id
      }
    });
  }
}
