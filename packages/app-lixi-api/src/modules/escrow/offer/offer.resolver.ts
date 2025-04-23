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
  POST_TYPE,
  OfferOrderField,
  OrderDirection
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { CommentType, OfferType, PostType, Role, Post as PostPrisma, db } from '@bcpros/lixi-prisma';
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
import { calculatePagination, paginateRawQuery } from 'src/utils/escrow/paginated';
import { BOOST_AMOUNT, newEpoch, offer_half_life, PAGE_SIZE } from 'src/utils/constants';
import { KyselyExecutorService } from 'src/modules/prisma/kysely-executor.service';
import { SelectQueryBuilder, sql } from 'kysely';
import { Database } from '@bcpros/lixi-prisma';
import { processTextOrderLimit } from 'src/utils/escrow/offer';

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private prismaExecutor: KyselyExecutorService,
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

  generateInlineKeyboard(url: string) {
    const isMiniAppEnabled: boolean = this.configService.get('TELEGRAM_MINI_APP_ENABLED') === 'true';
    return [[isMiniAppEnabled ? { text: 'Open Mini App', web_app: { url } } : { text: 'Open Web App', url }]];
  }

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
    // Default sorting if not provided
    const sortField = offerFilterInput?.offerOrder?.field || OfferOrderField.relevance;
    const sortDirection = offerFilterInput?.offerOrder?.direction || OrderDirection.desc;

    // join if needed
    const needsPaymentMethodJoin = (offerFilterInput?.paymentMethodIds?.length ?? 0) > 0;
    const needsLocationJoin = !!(
      offerFilterInput.countryCode ||
      offerFilterInput.adminCode ||
      offerFilterInput.cityName
    );

    // Main query
    const mainQuery = this.buildOfferSortQuery(
      sortField,
      sortDirection,
      offerFilterInput,
      after,
      (first ?? PAGE_SIZE) + 1,
      needsPaymentMethodJoin,
      needsLocationJoin
    );

    //Count query
    const countQuery = this.buildCountQuery(offerFilterInput, needsPaymentMethodJoin, needsLocationJoin);

    const paginated = await paginateRawQuery({
      mainQuery,
      countQuery,
      kyselyPrisma: this.prismaExecutor,
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

  private buildOfferSortQuery(
    sortField: OfferOrderField,
    sortDirection: OrderDirection,
    offerFilterInput: OfferFilterInput,
    after: string | undefined,
    first: number,
    needsPaymentMethodJoin: boolean,
    needsLocationJoin: boolean
  ) {
    // process for SQL injection
    const sortDir = sortDirection === OrderDirection.asc ? OrderDirection.asc : OrderDirection.desc;
    const halfLifeInterval = `${offer_half_life} hours`;

    // Custom relevance calculation using SQL tag
    const relevanceScoreCalc = sql<number>`
      total_relevance(relevance_score(
        COALESCE(boost_fee.boost_type, 'True'), 
        COALESCE(boost_fee.created_at, offer.created_at), 
        ${newEpoch} :: timestamp, 
        ${halfLifeInterval} :: interval, 
        COALESCE(boost_fee.boosted_value / ${BOOST_AMOUNT}, 1)
      ))
    `;

    if (sortField === OfferOrderField.price) {
      // Use margin_percentage because  in 1 currency, price is always the same
      let query = db
        .selectFrom('offer')
        .select('offer.post_id as id')
        .select('offer.margin_percentage as sort_value')
        .$if(needsPaymentMethodJoin, qb =>
          qb.leftJoin('offer_payment_method', 'offer.post_id', 'offer_payment_method.offer_id')
        )
        .$if(needsLocationJoin, qb => qb.leftJoin('world_cities', 'offer.location_id', 'world_cities.id'))
        .$call(qb => this.applyWhereConditions(qb, offerFilterInput))
        .$if(!!after, qb => qb.where('offer.post_id', '>', after ?? ''))
        .orderBy('offer.margin_percentage', sortDir)
        .orderBy('offer.post_id', 'asc')
        .limit(first);

      return query;
    } else if (sortField === OfferOrderField.trades || sortField === OfferOrderField.donationAmount) {
      // Complex query with CTEs using Kysely's CTE support
      return db
        .with('SellerPrecomputed', qb => {
          return qb
            .selectFrom('escrow_order as eo')
            .leftJoin('dispute as d', 'eo.id', 'd.escrow_order_id')
            .select(['d.status as dispute_status' as any, 'eo.seller_account_id as relevant_account_id'])
            .selectAll('eo');
        })
        .with('BuyerPrecomputed', qb => {
          return qb
            .selectFrom('escrow_order as eo')
            .leftJoin('dispute as d', 'eo.id', 'd.escrow_order_id')
            .select(['d.status as dispute_status' as any, 'eo.buyer_account_id as relevant_account_id'])
            .selectAll('eo');
        })
        .with('Precomputed', qb => {
          return qb.selectFrom('SellerPrecomputed').selectAll().unionAll(qb.selectFrom('BuyerPrecomputed').selectAll());
        })
        .with('OverallStats', qb => {
          return qb
            .selectFrom('Precomputed as eo')
            .select('relevant_account_id')
            .select(
              sql<number>`
              COALESCE(SUM(eo.seller_donate_amount), 0) + 
              COALESCE(SUM(eo.buyer_donate_amount), 0)
            `.as(OfferOrderField.donationAmount)
            )
            .select(
              sql<number>`
              SUM(CASE WHEN eo.status = 'COMPLETE' THEN 1 ELSE 0 END)
            `.as(OfferOrderField.trades)
            )
            .groupBy('relevant_account_id');
        })
        .selectFrom('offer')
        .innerJoin('post', 'offer.post_id', 'post.id')
        .leftJoin('boost_fee', 'offer.post_id', 'boost_fee.boosted_for_id')
        .leftJoin('OverallStats as stats', 'post.account_id', 'stats.relevant_account_id')
        .$if(needsPaymentMethodJoin, qb =>
          qb.leftJoin('offer_payment_method', 'offer.post_id', 'offer_payment_method.offer_id')
        )
        .$if(needsLocationJoin, qb => qb.leftJoin('world_cities', ' offer.location_id', 'world_cities.id'))
        .select('offer.post_id as id')
        .select(sql<number>`COALESCE(stats.${sql.raw(sortField)}, 0)`.as('sort_value'))
        .select(relevanceScoreCalc.as('relevance_score'))
        .$call(qb => this.applyWhereConditions(qb, offerFilterInput))
        .$if(!!after, qb => qb.where('offer.post_id', '>', after ?? ''))
        .groupBy(['offer.post_id', sql.raw(`stats.${sortField}`)])
        .orderBy('sort_value', sortDir)
        .orderBy('relevance_score', 'desc')
        .limit(first);
    } else {
      // Default: Sort by relevance
      let query = db
        .selectFrom('offer')
        .leftJoin('boost_fee', 'offer.post_id', 'boost_fee.boosted_for_id')
        .$if(needsPaymentMethodJoin, qb =>
          qb.leftJoin('offer_payment_method', 'offer.post_id', 'offer_payment_method.offer_id')
        )
        .$if(needsLocationJoin, qb => qb.leftJoin('world_cities', 'offer.location_id', 'world_cities.id'))
        .select('offer.post_id as id')
        .select(relevanceScoreCalc.as('score'))
        .$call(qb => this.applyWhereConditions(qb, offerFilterInput))
        .$if(!!after, qb => qb.where('offer.post_id', '>', after ?? ''))
        .groupBy('offer.post_id')
        .orderBy('score', sortDir)
        .orderBy('offer.post_id', 'asc')
        .limit(first);

      return query;
    }
  }

  private buildCountQuery(
    offerFilterInput: OfferFilterInput,
    needsPaymentMethodJoin: boolean,
    needsLocationJoin: boolean
  ) {
    let query = db
      .selectFrom('offer')
      .select(eb => eb.fn.countAll().as('total'))
      .$if(needsPaymentMethodJoin, qb =>
        qb.leftJoin('offer_payment_method', 'offer.post_id', 'offer_payment_method.offer_id')
      )
      .$if(needsLocationJoin, qb => qb.leftJoin('world_cities', 'offer.location_id', 'world_cities.id'))
      .$call(qb => this.applyWhereConditions(qb, offerFilterInput));

    return query;
  }

  private applyWhereConditions(query: SelectQueryBuilder<Database, any, any>, offerFilterInput: OfferFilterInput) {
    return (
      query
        .where('offer.hide_from_home', '=', false)
        .where(sql`offer.status::text`, '=', OfferStatus.ACTIVE)

        // Sử dụng phương thức $if thay vì các câu lệnh if-then thông thường
        .$if((offerFilterInput?.paymentMethodIds?.length ?? 0) > 0, qb =>
          qb.where('offer_payment_method.payment_method_id', 'in', offerFilterInput.paymentMethodIds!)
        )

        .$if(!!offerFilterInput?.countryCode, qb => qb.where('world_cities.iso2', '=', offerFilterInput.countryCode!))

        .$if(!!offerFilterInput?.adminCode, qb => qb.where('world_cities.admin_code', '=', offerFilterInput.adminCode!))

        .$if(!!offerFilterInput?.cityName, qb => qb.where('world_cities.city_ascii', '=', offerFilterInput.cityName!))

        .$if(!!offerFilterInput?.fiatCurrency, qb =>
          qb.where('offer.local_currency', '=', offerFilterInput.fiatCurrency!)
        )

        .$if(!!offerFilterInput?.coin, qb => qb.where('offer.coin_payment', '=', offerFilterInput.coin!))

        .$if(!!offerFilterInput?.paymentApp, qb => qb.where('offer.payment_app', '=', offerFilterInput.paymentApp!))

        .$if(!!offerFilterInput?.coinOthers, qb => qb.where('offer.coin_others', '=', offerFilterInput.coinOthers!))

        // if order-limit is null, we will drop this condition
        .$if(!!offerFilterInput?.amount, qb =>
          qb.where(eb => {
            // First check if both limits are null
            const hasNullLimits = eb.and([
              eb('offer.order_limit_min', 'is', null),
              eb('offer.order_limit_max', 'is', null)
            ]);

            // Then check if amount is within limits
            const amountWithinLimits = eb.and([
              eb('offer.order_limit_min', '<=', offerFilterInput.amount!),
              eb('offer.order_limit_max', '>=', offerFilterInput.amount!)
            ]);

            // Return offers where either limits are null OR amount is within limits
            return eb.or([hasNullLimits, amountWithinLimits]);
          })
        )

        .$if(offerFilterInput?.isBuyOffer !== null && offerFilterInput?.isBuyOffer !== undefined, qb =>
          qb.where(sql`offer.type::text`, '=', offerFilterInput.isBuyOffer ? OfferType.BUY : OfferType.SELL)
        )
    );
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
        take: (first ?? PAGE_SIZE) + 1, // plus 1 to check next page
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
        take: (first ?? PAGE_SIZE) + 1, // plus 1 to check next page
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
      const orderLimitText = processTextOrderLimit(offer?.orderLimitMin, offer?.orderLimitMax, ticket);

      let formatReplied =
        strLocation && strLocation !== ''
          ? format(
              BOT.MESSAGE.OFFER_CREATED,
              strTypeListOffer,
              result.id,
              link,
              offer?.message,
              offer?.marginPercentage,
              orderLimitText,
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
              orderLimitText,
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
          orderLimitText,
          offer?.paymentMethods[0].paymentMethod.name
        );
      }

      account.telegramId &&
        (await this.bot.telegram
          .sendMessage(account.telegramId, formatReplied, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: this.generateInlineKeyboard(link)
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
