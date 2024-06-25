import { BurnForType, Token } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { basicSortedSetPagination } from '../../common/custom-graphql-relay/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { epoch } from '@bcpros/lixi-models';

export class TokenTimelineCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  static tokenTimelineKey = 'timeline:tokens';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async cacheTokenTimeline() {
    const key = `${TokenTimelineCacheService.tokenTimelineKey}`;
    const tokenBurnType = BurnForType.Token;
    const postBurnType = BurnForType.Post;
    const halfLife = '6 months';
    try {
      const tokens = await this.prisma.$queryRaw<{ id: string; score: number }[]>(
        Prisma.sql`
            SELECT
              token.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              token 
              LEFT OUTER JOIN
                  burn 
                  ON token.id = burn.burned_for_id 
              AND
                burn.burn_for_type = ${tokenBurnType} 
              AND 
                burn.burned_value > 0 
            GROUP BY
              token.id 
            ORDER by
              score desc
            LIMIT 1000;
          `
      );

      console.log(tokens);

      const tokensByPosts = await this.prisma.$queryRaw<{ id: string; score: number }[]>(
        Prisma.sql`
            SELECT
              token.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              post 
              JOIN
                  token
                  ON post.token_id = token.id
              JOIN
                  burn 
                  ON post.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${postBurnType} 
              AND burn.burned_value > 0 
            GROUP BY
              token.id 
            ORDER by
              score desc
            LIMIT 1000;
          `
      );
      const pipeline = this.redis.pipeline();
      for (const token of tokens) {
        const id = `${token.id}`;
        pipeline.zincrby(key, token.score ?? 0, id);
      }
      for (const token of tokensByPosts) {
        const id = token.id;
        pipeline.zincrby(key, token.score ?? 0, id);
      }
      // Refresh the timeline after 30 days
      pipeline.expire(key, 2592000);
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async cacheToken(token: Token) {
    const key = `${TokenTimelineCacheService.tokenTimelineKey}`;
    const id = `${token.id}`;
    await this.redis.zadd(key, 0, id);
  }

  async getPaginatedTokenTimeline(first: number, after?: string) {
    const key = `${TokenTimelineCacheService.tokenTimelineKey}`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheTokenTimeline();
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }
}
