import {
  Account,
  BasicPaginationArgs,
  IBasicPaginated,
  PostConnection,
  POST_TYPE,
  TimelineItem,
  TimelineItemConnection
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { createEdge } from '../../common/custom-graphql-relay/paginate';
import { AccountEntity } from '../../decorators';
import { GqlHttpExceptionFilter } from '../../middlewares/gql.exception.filter';
import { GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { PageCacheService } from '../page/page-cache.service';
import PostLoader from '../page/post.loader';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineItemService } from './timeline-item.service';
import { TimelineService } from './timeline.service';

const pubSub = new PubSub();

@Injectable()
@Resolver(() => TimelineItem)
@SkipThrottle()
@UseFilters(GqlHttpExceptionFilter)
export class TimelineResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postLoader: PostLoader,
    private readonly timelineService: TimelineService,
    private readonly timelineItemService: TimelineItemService,
    private readonly pageCacheService: PageCacheService,
    @InjectRedis() private readonly redis: Redis,
    @I18n() private readonly i18n: I18nService
  ) {}

  @SkipThrottle()
  @Query(returns => TimelineItem)
  @UseGuards(GqlJwtAuthGuardByPass)
  @UseFilters(GqlHttpExceptionFilter)
  async timeline(@Args('id', { type: () => String }) id: string) {
    return await this.timelineItemService.getById(id);
  }

  @SkipThrottle()
  @Query(returns => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuardByPass)
  async homeTimeline(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'level', type: () => Number, nullable: true }) level: number
  ) {
    const accountId = account ? account.id : undefined;
    const paginated = await this.timelineService.getPaginatedTimeline(level, first, accountId, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);

    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;

    return result;
  }

  @SkipThrottle()
  @Query(returns => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuardByPass)
  async profileTimeline(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => Number }) id: number
  ) {
    const paginated = await this.timelineService.getProfilePaginatedTimeline(id, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);

    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;
    return result;
  }

  @SkipThrottle()
  @Query(returns => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuardByPass)
  async pageTimeline(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => String }) id: string
  ) {
    const paginated = await this.timelineService.getPagePaginatedTimeline(id, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);

    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;

    return result;
  }

  @SkipThrottle()
  @Query(returns => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuardByPass)
  async pageTimelineByTime(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => String }) id: string,
    @Args({ name: 'level', type: () => Number }) level: number,
    @Args({ name: 'showNegative', type: () => Boolean }) showNegative: boolean
  ) {
    const page = await this.pageCacheService.getById(id);

    if (!page) {
      return null;
    }

    if ((level === 0 || _.isNil(level)) && showNegative === false) {
      if (account) {
        const paginated = await this.timelineService.getPagePaginatedTimelineByTimeWithAccount(
          id,
          account.id,
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
      } else {
        //Filter out negative post and query larger than 0 but also include post account
        const paginated = await this.timelineService.getPagePaginatedTimelineByTimeNoAccount(id, first, after);
        const timelineIds = paginated.edges.map(item => item.cursor);
        const timelines = await this.timelineItemService.getByIds(timelineIds);

        const result = {
          ...paginated,
          edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
        } as IBasicPaginated<TimelineItem>;

        return result;
      }
    }

    //Query by level
    if (level !== 0 && !_.isNil(level)) {
      const paginated = await this.timelineService.getPagePaginatedTimelineByTimeWithLevel(id, level, first, after);
      const timelineIds = paginated.edges.map(item => item.cursor);
      const timelines = await this.timelineItemService.getByIds(timelineIds);

      const result = {
        ...paginated,
        edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
      } as IBasicPaginated<TimelineItem>;

      return result;
    }

    //Query no level with show negative and must have an account
    if ((level === 0 || _.isNil(level)) && showNegative === true && account) {
      const paginated = await this.timelineService.getPagePaginatedTimelineByTimeNoLevelShowNegative(id, first, after);
      const timelineIds = paginated.edges.map(item => item.cursor);
      const timelines = await this.timelineItemService.getByIds(timelineIds);

      const result = {
        ...paginated,
        edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
      } as IBasicPaginated<TimelineItem>;

      return result;
    }
  }

  @SkipThrottle()
  @Query(returns => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuardByPass)
  async tokenTimeline(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => String }) id: string
  ) {
    const paginated = await this.timelineService.getTokenPaginatedTimeline(id, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);

    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;

    return result;
  }
}
