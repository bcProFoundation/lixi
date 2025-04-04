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
  Location,
  UpdateOfferHideFromHomeInput,
  PAYMENT_METHOD,
  POST_TYPE
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { CommentType, OfferType, PostType, Prisma, Role, Post as PostPrisma } from '@bcpros/lixi-prisma';
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
import { COIN_OTHERS } from '../escrow.contants';
import { ConfigService } from '@nestjs/config';
import { BOOST_AMOUNT, newEpoch, offer_half_life } from 'src/utils/constants';
import { calculatePagination, paginateRawQuery } from 'src/utils/escrow/paginated';

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private readonly configService: ConfigService,
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
    const isBuyOffer = offerFilterInput.isBuyOffer ?? true;

    offerFilterInput = {
      countryCode: offerFilterInput.countryCode ?? null,
      adminCode: offerFilterInput.adminCode ? replaceDashWithUnderscore(offerFilterInput.adminCode) : null,
      cityName: offerFilterInput.cityName ? replaceDashWithUnderscore(offerFilterInput.cityName) : null,
      paymentMethodIds: offerFilterInput.paymentMethodIds,
      coin: offerFilterInput.coin ?? null,
      fiatCurrency: offerFilterInput.fiatCurrency ?? null,
      paymentApp: offerFilterInput.paymentApp ?? null
    };
    const paginated = await this.offerCacheService.getOfferFilterPaginatedTimeline(
      isBuyOffer,
      offerFilterInput,
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

  @Query(() => TimelineItemConnection)
  async offerByFilterDatabase(
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerFilterInput', type: () => OfferFilterInput }) offerFilterInput: OfferFilterInput
  ) {
    // join if needed
    const needsPaymentMethodJoin = offerFilterInput?.paymentMethodIds?.length ?? 0 > 0;
    const needsLocationJoin = offerFilterInput.countryCode || offerFilterInput.adminCode || offerFilterInput.cityName;

    const whereClause = this.buildWhereConditions(offerFilterInput);

    // Build cursor condition
    let cursorCondition = Prisma.empty;
    if (after) {
      cursorCondition = Prisma.sql`AND o.post_id > ${after}`;
    }

    // Main query
    const halfLifeInterval = `${offer_half_life} hours`;
    const mainQuery = Prisma.sql`
    SELECT
      o.post_id as id,
      total_relevance(relevance_score(
        COALESCE(boost.boost_type, 'True'), 
        COALESCE(boost.created_at, o.created_at), 
        ${newEpoch} :: timestamp, 
        ${halfLifeInterval} :: interval, 
        COALESCE(boost.boosted_value / ${BOOST_AMOUNT}, 1)
        )) AS score 
    FROM
      offer as o
      LEFT JOIN
        boost_fee as boost 
        ON o.post_id = boost.boosted_for_id
    ${needsPaymentMethodJoin ? Prisma.sql`JOIN offer_payment_method opm ON o.post_id = opm.offer_id` : Prisma.empty}
    ${needsLocationJoin ? Prisma.sql`JOIN world_cities wc ON o.location_id = wc.id` : Prisma.empty}
    ${whereClause}
    ${cursorCondition}
    GROUP BY
      o.post_id
    ORDER by
      score desc
    LIMIT ${(first ?? 20) + 1} -- plus 1 to check next page
  `;

    // Count query
    const countQuery = Prisma.sql`
    SELECT COUNT(*) as total
    FROM offer o
    ${needsPaymentMethodJoin ? Prisma.sql`JOIN offer_payment_method opm ON o.post_id = opm.offer_id` : Prisma.empty}
    ${needsLocationJoin ? Prisma.sql`JOIN world_cities wc ON o.location_id = wc.id` : Prisma.empty}
    ${whereClause}
  `;

    const paginated = await paginateRawQuery({
      mainQuery,
      countQuery,
      prisma: this.prisma,
      first,
      after,
      cursorField: 'id',
      cursorPrefix: POST_TYPE.OFFER
    });

    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  private buildWhereConditions(offerFilterInput: OfferFilterInput) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`o.hide_from_home = false`,
      Prisma.sql`o.status::text = ${OfferStatus.ACTIVE}`
    ];

    if (offerFilterInput?.paymentMethodIds?.length) {
      const idList = offerFilterInput.paymentMethodIds.map(id => Prisma.sql`${id}`);
      conditions.push(Prisma.sql`opm.payment_method_id IN (${Prisma.join(idList)})`);
    }

    if (offerFilterInput?.countryCode) {
      conditions.push(Prisma.sql`wc.iso2 = ${offerFilterInput.countryCode}`);
    }

    if (offerFilterInput?.adminCode) {
      conditions.push(Prisma.sql`wc.admin_code = ${offerFilterInput.adminCode}`);
    }

    if (offerFilterInput?.cityName) {
      conditions.push(Prisma.sql`wc.city_ascii = ${offerFilterInput.cityName}`);
    }

    if (offerFilterInput?.fiatCurrency) {
      conditions.push(Prisma.sql`o.local_currency = ${offerFilterInput.fiatCurrency}`);
    }

    if (offerFilterInput?.coin) {
      conditions.push(Prisma.sql`o.coin_payment = ${offerFilterInput.coin}`);
    }

    if (offerFilterInput?.paymentApp) {
      conditions.push(Prisma.sql`o.payment_app = ${offerFilterInput.paymentApp}`);
    }

    if (offerFilterInput?.amount) {
      conditions.push(Prisma.sql`${offerFilterInput.amount} BETWEEN o.order_limit_min AND o.order_limit_max`);
    }

    if (offerFilterInput?.isBuyOffer !== null && offerFilterInput?.isBuyOffer !== undefined) {
      conditions.push(Prisma.sql`o.type::text = ${offerFilterInput.isBuyOffer ? OfferType.BUY : OfferType.SELL}`);
    }

    // Join all conditions if we have any
    const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    return whereClause;
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

  @Query(() => TimelineItemConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allOfferByAccountDatabase(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'offerStatus', type: () => OfferStatus }) offerStatus: OfferStatus
  ) {
    if (!account) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    const whereClause = {
      accountId: account?.id,
      offer: {
        status: offerStatus
      }
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: (first ?? 20) + 1, // plus 1 to check next page
        ...(after && { cursor: { id: after }, skip: 1 })
      }),
      this.prisma.post.count({
        where: whereClause
      })
    ]);

    const paginated = calculatePagination<PostPrisma>({
      items,
      totalCount,
      first,
      cursorField: 'id',
      cursorPrefix: PostType.OFFER
    });

    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @Query(() => TimelineItemConnection)
  async allOfferActiveByAccountId(
    @Args() { after, first }: BasicPaginationArgs,
    @Args('accountId', { type: () => Number }) accountId: number
  ) {
    const paginated = await this.offerCacheService.getPaginatedMyOfferTimelineByTime(
      accountId,
      OfferStatus.ACTIVE,
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

  @Query(() => TimelineItemConnection)
  async allOfferActiveByAccountIdDatabase(
    @Args() { after, first }: BasicPaginationArgs,
    @Args('accountId', { type: () => Number }) accountId: number
  ) {
    const whereClause = {
      accountId: accountId,
      offer: {
        status: OfferStatus.ACTIVE
      }
    };

    const [items, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: (first ?? 20) + 1, // plus 1 to check next page
        ...(after && { cursor: { id: after }, skip: 1 })
      }),
      this.prisma.post.count({
        where: whereClause
      })
    ]);

    const paginated = calculatePagination<PostPrisma>({
      items,
      totalCount,
      first,
      cursorField: 'id',
      cursorPrefix: PostType.OFFER
    });

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
    try {
      const { paymentMethodIds, pageId, createFeeHex, coin, locationId } = data;

      const moderatorAccount = await this.prisma.account.findUnique({
        where: {
          id: account.id,
          role: Role.MODERATOR
        }
      });

      if (moderatorAccount) {
        throw new Error('Moderator account is not allowed to create offer');
      }

      if (account.telegramUsername && !account.telegramUsername.startsWith('@')) {
        throw new Error('Telegram username is not valid');
      }

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
                coinOthers: data.coinOthers ?? '',
                localCurrency: data.localCurrency,
                paymentApp: data.paymentApp,
                orderLimitMin: data.orderLimitMin,
                orderLimitMax: data.orderLimitMax,
                hideFromHome: data.hideFromHome,
                type: data.type,
                location: {
                  connect:
                    paymentMethodIds[0] === PAYMENT_METHOD.CASH_IN_PERSON && locationId ? { id: locationId } : undefined //cash in person
                },
                country: {
                  connect:
                    paymentMethodIds[0] === PAYMENT_METHOD.BANK_TRANSFER && locationId
                      ? { id: Number(locationId) }
                      : undefined //bank transfer
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
                    name: true,
                    iso2: true
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
      let strLocation =
        locationOfOffer &&
        `${[locationOfOffer?.cityAscii, locationOfOffer?.adminNameAscii, locationOfOffer?.country].filter(Boolean).join(', ')}`;
      if (offer?.country) {
        strLocation = `${offer?.country.name}`;
      }

      const offerData = offer;
      const ticket =
        offerData?.localCurrency ??
        (offerData?.coinPayment?.includes(COIN_OTHERS) ? 'XEC' : offerData?.coinPayment) ??
        'XEC';

      //id - link - message - margin - orderLimit - paymentMethod - location
      const link = `${this.configService.get('LOCAL_ECASH_URL')}/offer-detail?id=${result.id}`;
      let strTypeListOffer = data?.hideFromHome ? 'Unlisted' : 'Listed';
      offerData?.type === OfferType.BUY ? (strTypeListOffer += ' Buy') : (strTypeListOffer += ' Sell');
      let formatReplied =
        strLocation && strLocation !== ''
          ? format(
              BOT.MESSAGE.OFFER_CREATED,
              strTypeListOffer,
              result.id,
              link,
              offer?.message,
              offer?.marginPercentage,
              `${offer?.orderLimitMin.toLocaleString('en-US')} ${ticket} - ${offer?.orderLimitMax.toLocaleString('en-US')} ${ticket}`,
              offer?.paymentMethods[0].paymentMethod.name,
              strLocation
            )
          : format(
              BOT.MESSAGE.OFFER_CREATED_WITHOUT_LOCATION,
              strTypeListOffer,
              result.id,
              link,
              offer?.message,
              offer?.marginPercentage,
              `${offer?.orderLimitMin.toLocaleString('en-US')} ${ticket} - ${offer?.orderLimitMax.toLocaleString('en-US')} ${ticket}`,
              offer?.paymentMethods[0].paymentMethod.name
            );

      //process for goods services
      if (paymentMethodIds[0] === PAYMENT_METHOD.GOODS_SERVICES) {
        formatReplied = format(
          BOT.MESSAGE.OFFER_CREATED_GOODS_SERVICES,
          strTypeListOffer,
          result.id,
          link,
          offer?.message,
          `${offer?.orderLimitMin.toLocaleString('en-US')} ${ticket} - ${offer?.orderLimitMax.toLocaleString('en-US')} ${ticket}`,
          offer?.paymentMethods[0].paymentMethod.name
        );
      }

      account.telegramId &&
        (await this.bot.telegram
          .sendMessage(account.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Web App',
                    url: link
                  }
                ]
              ]
            }
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
    } catch (e) {
      this.logger.error(e);
    }
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
        marginPercentage: data.marginPercentage ?? 0
      }
    });

    //remove cache and add again
    await this.offerCacheService.removeByKeys([offerUpdated.postId]);

    await this.offerCacheService.getById(offerUpdated.postId);

    return offerUpdated;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Offer)
  async UpdateOfferHideFromHome(@AccountEntity() account: Account, @Args('data') data: UpdateOfferHideFromHomeInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }

    const offerUpdated = await this.prisma.offer.update({
      where: {
        postId: data.id
      },
      data: {
        hideFromHome: data.hideFromHome ?? false
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
