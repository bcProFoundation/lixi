import { BurnForType, Page } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { basicSortedSetPagination } from '../../common/custom-graphql-relay/paginate';
import { PrismaService } from '../prisma/prisma.service';

export class PageTimelineCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  static pageTimelineKey = 'timeline:pages';
  static pageByUserTimelineKeyPrefix = 'timeline:pages:user';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async cachePageTimeline() {
    const key = `${PageTimelineCacheService.pageTimelineKey}`;
    const pageBurnType = BurnForType.Page;
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '6 months';
    try {
      const pages = await this.prisma.$queryRaw<{ id: string; score: number }[]>(
        Prisma.sql`
            SELECT
              page.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              page 
              JOIN
                  burn 
                  ON page.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${pageBurnType} 
              AND burn.burned_value > 0 
            GROUP BY
              page.id 
            ORDER by
              score desc
            LIMIT 1000;
          `
      );

      const pagesByPosts = await this.prisma.$queryRaw<{ id: string; score: number }[]>(
        Prisma.sql`
            SELECT
              page.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              post 
              JOIN
                  page
                  ON post.page_id = page.id
              JOIN
                  burn 
                  ON post.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${postBurnType} 
              AND burn.burned_value > 0 
            GROUP BY
              page.id 
            ORDER by
              score desc
            LIMIT 1000;
          `
      );
      const pipeline = this.redis.pipeline();
      for (const page of pages) {
        const id = `${page.id}`;
        pipeline.zincrby(key, page.score, id);
      }
      for (const page of pagesByPosts) {
        const id = page.id;
        pipeline.zincrby(key, page.score, id);
      }
      // Refresh the timeline after 30 days
      pipeline.expire(key, 2592000);
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async cachePageTimelineByUser(accountId: number, after?: string) {
    const key = `${PageTimelineCacheService.pageByUserTimelineKeyPrefix}:${accountId.toString()}`;
    const dbValues = await this.prisma.page.findMany({
      where: {
        pageAccountId: accountId
      },
      select: {
        id: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      cursor: after ? { id: after } : undefined,
      take: 1000
    });
    if (dbValues.length == 0) return false;
    const pipeline = this.redis.pipeline();
    for (const dbValue of dbValues) {
      const id = `${dbValue.id}`;
      pipeline.zadd(key, dbValue.createdAt.getTime(), id);
    }
    // Refresh the timeline after 30 days
    pipeline.expire(key, 2592000);
    await pipeline.exec();
    return true;
  }

  async cachePage(page: Page) {
    const key = `${PageTimelineCacheService.pageTimelineKey}`;
    const id = `${page.id}`;
    await this.redis.zadd(key, 0, id);

    const accountId = page.pageAccountId;
    const keyForUser = `${PageTimelineCacheService.pageByUserTimelineKeyPrefix}:${accountId.toString()}`;
    await this.redis.zadd(keyForUser, page.createdAt.getTime(), id);
  }

  async getPaginatedPageTimeline(first: number, after?: string) {
    const key = `${PageTimelineCacheService.pageTimelineKey}`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimeline();
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }

  async getPaginatedPageTimelineByUser(accountId: number, first: number, after?: string) {
    const key = `${PageTimelineCacheService.pageByUserTimelineKeyPrefix}:${accountId.toString()}`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimelineByUser(accountId);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const newAfter = paginated.pageInfo.endCursor;
    // Check if we need to load more and paginate again
    const shouldPaginate = await this.cachePageTimelineByUser(accountId, newAfter);
    if (shouldPaginate) {
      return await basicSortedSetPagination(this.redis, key, first, after);
    }
    // nothing change
    return paginated;
  }
}
