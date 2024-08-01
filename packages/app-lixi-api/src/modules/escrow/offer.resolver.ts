import {
  Account,
  BasicPaginationArgs,
  COIN,
  CreateOfferInput,
  IBasicPaginated,
  Offer,
  TimelineItem,
  TimelineItemConnection
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { CommentType, PostType } from '@bcpros/lixi-prisma';
import { ChronikClient } from 'chronik-client';
import { InjectChronikClient } from 'nestjs-chronik';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { OfferCacheService } from './offer-cache.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { CONTENT_FANOUT_QUEUE } from '../page/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';
import { TimelineItemService } from '../timeline/timeline-item.service';

@SkipThrottle()
@Resolver(() => Offer)
@UseFilters(GqlHttpExceptionFilter)
export class OfferResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    @InjectQueue(CONTENT_FANOUT_QUEUE) private postFanoutQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly offerCacheService: OfferCacheService,
    private readonly timelineItemService: TimelineItemService
  ) {}

  @Query(() => Offer)
  async offer(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.offer.findUnique({
      where: { postId: id }
    });

    return result;
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
  async allOfferByPublicKey(
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'publicKey', type: () => String }) publicKey: string
  ) {
    const paginated = await this.offerCacheService.getPaginatedMyOfferTimelineByTime(publicKey, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);
    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Offer)
  async createOffer(@AccountEntity() account: Account, @Args('data') data: CreateOfferInput) {
    const { paymentMethodIds, pageId, createFeeHex, coin } = data;

    const offer = await this.prisma.$transaction(async prisma => {
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
              price: data.price,
              publicKey: account?.publicKey ?? '',
              orderLimitMin: data.orderLimitMin,
              orderLimitMax: data.orderLimitMax
            }
          }
        },
        include: {
          offer: true
        }
      });

      // Step 2: Create OfferPaymentMethod Entries
      const offerPaymentMethods = paymentMethodIds.map(paymentMethodId => {
        return {
          offerId: createdOffer.id,
          paymentMethodId
        };
      });

      await prisma.offerPaymentMethod.createMany({
        data: offerPaymentMethods
      });

      return createdOffer;
    });

    //add to cache
    await this.postFanoutQueue.add(CONTENT_FANOUT_QUEUE, { post: offer });
    return offer?.offer;
  }

  @ResolveField('paymentMethods', () => String)
  async paymentMethods(@Parent() offer: Offer) {
    const offerPaymentMethod = await this.prisma.offerPaymentMethod.findMany({
      where: {
        offerId: offer.postId
      }
    });
    return offerPaymentMethod;
  }
}
