import {
  Account,
  BasicPaginationArgs,
  COIN,
  Country,
  CreateOfferInput,
  IBasicPaginated,
  Offer,
  OfferStatus,
  Post,
  OfferFilterInput,
  PaymentMethod,
  State,
  TimelineItem,
  TimelineItemConnection,
  UpdateOfferInput,
  UpdateOfferStatusInput,
  Location
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { CommentType, PostType } from '@bcpros/lixi-prisma';
import { ChronikClient, ChronikClientNode } from 'chronik-client';
import { InjectChronikClient, InjectChronikClientNode } from 'nestjs-chronik';
import { GqlJwtAuthGuard } from '../../auth/guards/gql-jwtauth.guard';
import { OfferCacheService } from './offer-cache.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { CONTENT_FANOUT_QUEUE } from '../../page/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';
import { TimelineItemService } from '../../timeline/timeline-item.service';
import { VError } from 'verror';
import OfferLoader from './offer.loader';
import { NotificationGateway } from 'src/common/modules/notifications/notification.gateway';
import { PostCacheService } from 'src/modules/page/post-cache.service';
import { InjectBot } from 'nestjs-telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from 'src/modules/telegram/telegram-bot.constants';
import { format } from 'node:util';
import { Context, Telegraf } from 'telegraf';
import { BOT } from 'src/utils/bot.constants';

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClientNode('xec') private chronikXEC: ChronikClientNode,
    @InjectQueue(CONTENT_FANOUT_QUEUE) private postFanoutQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    private readonly offerCacheService: OfferCacheService,
    private readonly postCacheService: PostCacheService,
    private readonly timelineItemService: TimelineItemService,
    private readonly offerLoader: OfferLoader,
    private notificationGateway: NotificationGateway
  ) {}

  @Query(() => Offer)
  @UseGuards(GqlJwtAuthGuard)
  async offer(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        AND: [{ id: id, accountId: account.id }]
      },
      include: {
        offer: true
      }
    });

    return post?.offer;
  }

  @Query(() => TimelineItemConnection)
  async allOffer(@Args() { after, first }: BasicPaginationArgs) {
    const paginated = await this.offerCacheService.getOfferPaginatedTimeline(first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;

    return result;
  }

  @Query(() => TimelineItemConnection)
  async offerByFilter(
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerFilterInput', type: () => OfferFilterInput }) offerFilterInput: OfferFilterInput
  ) {
    const replaceDashWithUnderscore = (str: any) => (str ? str.replace(/-/g, '_') : str);

    offerFilterInput = {
      countryCode: offerFilterInput.countryCode ?? null,
      adminCode: replaceDashWithUnderscore(offerFilterInput.adminCode),
      cityName: replaceDashWithUnderscore(offerFilterInput.cityName),
      paymentMethodIds: offerFilterInput.paymentMethodIds,
      coin: offerFilterInput.coin ?? null,
      fiatCurrency: offerFilterInput.fiatCurrency ?? null
    };
    const paginated = await this.offerCacheService.getOfferFilterPaginatedTimeline(offerFilterInput, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allOfferByAccount(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerStatus', type: () => OfferStatus }) offerStatus: OfferStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }
    const paginated = await this.offerCacheService.getPaginatedMyOfferTimelineByTime(
      account.id,
      offerStatus,
      first,
      after
    );
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async createOffer(@AccountEntity() account: Account, @Args('data') data: CreateOfferInput) {
    const { paymentMethodIds, pageId, createFeeHex, coin, locationId } = data;

    const result = await this.prisma.$transaction(async prisma => {
      let txid: string | undefined;
      let broadcastResponse;
      if (createFeeHex) {
        switch (coin) {
          case COIN.XPI:
            broadcastResponse = await this.chronikXPI.broadcastTx(createFeeHex);
            break;
          case COIN.XEC:
            broadcastResponse = await this.chronikXEC.broadcastTx(createFeeHex);
            break;
          default:
            broadcastResponse = await this.chronikXPI.broadcastTx(createFeeHex);
            break;
        }
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
        txid = broadcastResponse.txid;
      }
      // Step 1: Create the Offer
      const createdOffer = await prisma.post.create({
        data: {
          content: '',
          account: { connect: { id: account?.id } }, //add later when have account
          page: {
            connect: pageId ? { id: pageId } : undefined
          },
          commentable: {
            create: {
              type: CommentType.OFFER
            }
          },
          type: PostType.OFFER,
          txid: txid,
          createFee: 0,
          dana: {
            create: {}
          },
          boostScore: {
            create: {}
          },
          taggable: {
            create: {}
          },
          offer: {
            create: {
              message: data.message,
              noteOffer: data.noteOffer,
              price: data.price,
              publicKey: account?.publicKey ?? '',
              marginPercentage: data.marginPercentage,
              coinPayment: data.coinPayment,
              localCurrency: data.localCurrency,
              orderLimitMin: data.orderLimitMin,
              orderLimitMax: data.orderLimitMax,
              location: {
                connect: locationId ? { id: locationId } : undefined
              },
              paymentMethods: {
                createMany: {
                  data: paymentMethodIds.map(item => {
                    return {
                      paymentMethodId: item
                    };
                  })
                }
              }
            }
          }
        },
        include: {
          offer: {
            include: {
              state: {
                select: {
                  id: true,
                  name: true
                }
              },
              country: {
                select: {
                  id: true,
                  name: true
                }
              },
              paymentMethods: {
                include: {
                  paymentMethod: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              },
              location: {
                select: {
                  id: true,
                  country: true,
                  iso2: true,
                  adminNameAscii: true,
                  adminCode: true,
                  cityAscii: true
                }
              }
            }
          }
        }
      });

      return createdOffer;
    });

    const { offer } = result || {};
    const locationOfOffer = offer?.location;
    const strLocation =
      locationOfOffer &&
      `${[locationOfOffer?.cityAscii, locationOfOffer?.adminNameAscii, locationOfOffer?.country].filter(Boolean).join(', ')}`;

    const formatReplied = format(
      BOT.MESSAGE.OFFER_CREATED,
      result.id,
      offer?.message,
      offer?.marginPercentage,
      offer?.orderLimitMin,
      offer?.orderLimitMax,
      offer?.paymentMethods[0].paymentMethod.name,
      strLocation ?? '---'
    );

    account.telegramId &&
      (await this.bot.telegram
        .sendMessage(account.telegramId, formatReplied, {
          parse_mode: 'Markdown'
        })
        .then(async res => {
          try {
            await this.prisma.offer.update({
              where: {
                postId: result.id
              },
              data: {
                telegramMessageId: res.message_id.toString()
              }
            });
          } catch (e) {
            this.logger.error(e);
          }
        })
        .catch(e => {
          this.logger.error(e);
        }));

    //add to cache
    await this.postFanoutQueue.add(CONTENT_FANOUT_QUEUE, { post: result });

    //emit new post
    this.notificationGateway.publishNewPost();
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Offer)
  async updateOffer(@AccountEntity() account: Account, @Args('data') data: UpdateOfferInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }

    const offerUpdated = await this.prisma.offer.update({
      where: {
        postId: data.id
      },
      data: {
        message: data.message ?? '',
        noteOffer: data.noteOffer ?? '',
        orderLimitMin: data.orderLimitMin ?? 0,
        orderLimitMax: data.orderLimitMax ?? 0,
        marginPercentage: data.marginPercentage ?? 0,
        coinPayment: data.coinPayment ?? '',
        localCurrency: data.localCurrency ?? '',
        paymentMethods: {
          deleteMany: {},
          createMany: {
            data:
              data.paymentMethodIds && data.paymentMethodIds.length > 0
                ? data.paymentMethodIds.map(item => {
                    return {
                      paymentMethodId: item
                    };
                  })
                : []
          }
        },
        country: {
          connect: data.countryId
            ? {
                id: Number(data.countryId)
              }
            : undefined
        },
        state: {
          disconnect: !data.stateId,
          connect: data.stateId
            ? {
                id: Number(data.stateId)
              }
            : undefined
        }
      }
    });

    //remove cache and add again
    await this.offerCacheService.removeByKeys([offerUpdated.postId]);

    await this.offerCacheService.getById(offerUpdated.postId);

    return offerUpdated;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async updateOfferStatus(@AccountEntity() account: Account, @Args('data') data: UpdateOfferStatusInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }

    //change from active to archive
    const offerUpdated = await this.prisma.offer.update({
      where: {
        postId: data.id
      },
      data: {
        status: data.status ?? OfferStatus.ARCHIVE
      }
    });

    //remove cache in mutiple keys and add to Archive key
    await this.offerCacheService.changeStatusOffer(account.id, offerUpdated.postId, offerUpdated.createdAt);

    //remove cache and add again
    await this.offerCacheService.removeByKeys([offerUpdated.postId]);
    await this.offerCacheService.getById(offerUpdated.postId);

    const post = await this.postCacheService.getById(offerUpdated.postId);
    return post;
  }

  @ResolveField('paymentMethods', () => [PaymentMethod])
  async paymentMethods(@Parent() offer: Offer) {
    const offerPaymentMethod = await this.prisma.offerPaymentMethod.findMany({
      where: {
        offerId: offer.postId
      }
    });
    return offerPaymentMethod;
  }

  @ResolveField('country', () => Country)
  async country(@Parent() offer: Offer) {
    return this.offerLoader.batchCountries.load(Number(offer?.countryId ?? '0'));
  }

  @ResolveField('state', () => State)
  async state(@Parent() offer: Offer) {
    return this.offerLoader.batchStates.load(Number(offer?.stateId ?? '0'));
  }

  @ResolveField('location', () => Location)
  async location(@Parent() offer: Offer) {
    if (!offer?.locationId) return null;
    return this.offerLoader.batchLocations.load(offer.locationId);
  }
}
