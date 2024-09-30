import {
  Account,
  BasicPaginationArgs,
  CreateDisputeInput,
  Dispute,
  DisputeStatus,
  EscrowOrderStatus,
  IBasicPaginated,
  TIMELINE_TYPE,
  TimelineItem,
  TimelineItemConnection,
  UpdateDisputeInput
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { GqlJwtAuthGuard } from '../../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import DisputeLoader from './dispute.loader';
import { VError } from 'verror';
import { DisputeCacheService } from './dispute-cache.service';
import { TimelineItemService } from 'src/modules/timeline/timeline-item.service';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';
import { InjectBot } from 'nestjs-telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../../telegram/telegram-bot.constants';
import { Context, Telegraf } from 'telegraf';
import { format } from 'node:util';
import { BOT } from 'src/utils/bot.constants';

@SkipThrottle()
@Resolver(() => Dispute)
@UseFilters(GqlHttpExceptionFilter)
export class DisputeResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private readonly disputeLoader: DisputeLoader,
    private readonly disputeCacheService: DisputeCacheService,
    private readonly timelineItemService: TimelineItemService,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>
  ) {}

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

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allDisputeByAccount(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'disputeStatus', type: () => DisputeStatus }) disputeStatus: DisputeStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }
    const paginated = await this.disputeCacheService.getPaginatedMyDisputeTimelineByTime(
      account.id,
      disputeStatus,
      first,
      after
    );
    const timelineIds = paginated.edges.map(item => item.cursor);
    // const timelines = await this.escrowOrderCacheService.getByIds(timelineIds);
    const timelines = await this.timelineItemService.getByIds(timelineIds, TIMELINE_TYPE.DISPUTE);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @Mutation(() => Dispute)
  @UseGuards(GqlJwtAuthGuard)
  async createDispute(@AccountEntity() account: Account, @Args('data') data: CreateDisputeInput) {
    try {
      const { escrowOrderId, createdBy, reason } = data;

      const escrowOrder = await this.prisma.escrowOrder.findUnique({
        where: {
          id: escrowOrderId
        },
        include: {
          dispute: true,
          arbitratorAccount: true,
          moderatorAccount: true,
          sellerAccount: true,
          buyerAccount: true
        }
      });

      if (!escrowOrder) {
        throw new Error('Escrow order not found');
      }

      const { sellerAccount, buyerAccount, arbitratorAccount, moderatorAccount } = escrowOrder;

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
      const url = `${process.env.LOCAL_ECASH_URL}/order-detail?id=${escrowOrder.id}`;

      if (createdBy === buyerAccount.publicKey && sellerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.BUYER_RAISED_DISPUTE, reason, url);
        await this.bot.telegram
          .sendMessage(sellerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open App',
                    web_app: {
                      url: `${process.env.LOCAL_ECASH_URL}/order-detail?id=${escrowOrderId}`
                    }
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      if (createdBy === sellerAccount.publicKey && buyerAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.SELLER_RAISED_DISPUTE, reason, url);
        await this.bot.telegram
          .sendMessage(buyerAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open App',
                    web_app: {
                      url: `${process.env.LOCAL_ECASH_URL}/order-detail?id=${escrowOrderId}`
                    }
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      if (arbitratorAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.NOTIFY_ARBI_MOD_DISPUTE, url);
        await this.bot.telegram
          .sendMessage(arbitratorAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open App',
                    web_app: {
                      url: `${process.env.LOCAL_ECASH_URL}/dispute-detail?id=${dispute.id}`
                    }
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }

      if (moderatorAccount.telegramId) {
        const formatReplied = format(BOT.MESSAGE.NOTIFY_ARBI_MOD_DISPUTE, url);
        await this.bot.telegram
          .sendMessage(moderatorAccount.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            protect_content: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open App',
                    web_app: {
                      url: `${process.env.LOCAL_ECASH_URL}/dispute-detail?id=${dispute.id}`
                    }
                  }
                ]
              ]
            }
          })
          .catch(e => {
            this.logger.error(e);
          });
      }
      return dispute;
    } catch (e) {
      this.logger.log(e);
    }
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

    return dispute;
  }

  @ResolveField()
  async escrowOrder(@Parent() dispute: Dispute) {
    return this.disputeLoader.batchEscrowOrders.load(dispute.escrowOrderId);
  }
}
