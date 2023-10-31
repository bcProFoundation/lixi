import { BurnForType } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { basicSortedSetPagination } from '../../common/custom-graphql-relay/paginate';
import { PrismaService } from '../prisma/prisma.service';

export class PageTimelineCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  static pageTimelineKey = 'timeline:pages';

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
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getPaginatedPageTimeline(first: number, after?: string) {
    const key = `${PageTimelineCacheService.pageTimelineKey}`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimeline();
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }
}
