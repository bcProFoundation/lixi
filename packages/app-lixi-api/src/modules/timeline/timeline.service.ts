import _ from 'lodash';
import moment from 'moment';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { I18n, I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { FollowCacheService } from '../account/follow-cache.service';
import { Prisma } from '@bcpros/lixi-prisma';
import { BurnForType, IPaginatedType, PageInfo } from '@bcpros/lixi-models';
import { Connection } from '../../common/custom-graphql-relay/connection';


@Injectable()
export class TimelineService {

  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetworksource';
  static outNetworkSourceKey = 'timeline:outnetworksource;';
  static ratioSteps = [0.1, 0.3, 0.5, 0.7, 0.9];


  constructor(
    private readonly prisma: PrismaService,
    private readonly followCacheService: FollowCacheService,
    @InjectRedis() private readonly redis: Redis,
    @I18n() private i18n: I18nService
  ) { }

  async cacheInNetworkByTime(accountId: number) {
    const key = `${TimelineService.inNetworkSourceKey}:${accountId}`;
    try {
      const followings = (await this.followCacheService.getAccountFollowings(accountId)).map(item => _.toSafeInteger(item));
      // get all the post of the following accounts, order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          postAccountId: true,
          createdAt: true
        },
        where: {
          postAccountId: {
            in: followings
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 500
      });

      const epoch = '2023-01-01 00:00:00';
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `post-${post.id}`;

        const diffHour = moment.duration(moment(post.createdAt).diff(moment(epoch))).asHours();
        const score = Math.pow(2, (diffHour / 12));
        pipeline.zincrby(key, score, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }


  async cacheInNetworkByScore(accountId: number) {
    const key = `${TimelineService.inNetworkSourceKey}:${accountId}`;
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    try {
      const followings = (await this.followCacheService.getAccountFollowings(accountId)).map(item => _.toSafeInteger(item));
      const posts = await this.prisma.$queryRaw<{ id: string, score: number }[]>(
        Prisma.sql`
            SELECT
              post.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              post 
              JOIN
                  burn 
                  ON post.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${postBurnType} 
              AND burn.burned_value > 0 
              AND post.post_account_id IN ${Prisma.join(followings)}
            GROUP BY
              post.id 
            ORDER by
              score desc
            LIMIT 500;
          `
      );

      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `post-${post.id}`;
        pipeline.zincrby(key, post.score, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getInNetwork(accountId: number) {
    const key = `${TimelineService.inNetworkSourceKey}:${accountId}`;
    const exist = await this.redis.exists([key]);

    if (!exist) {
      // build ranking items
      await this.cacheInNetworkByTime(accountId);
      await this.cacheInNetworkByScore(accountId);
    }

    return await this.redis.zrevrange(key, 0, -1);
  }

  async cacheOutNetwork() {
    const key = TimelineService.outNetworkSourceKey;
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    try {
      const posts = await this.prisma.$queryRaw<{ id: string, score: number }[]>(
        Prisma.sql`
            SELECT
              post.id,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              post 
              JOIN
                  burn 
                  ON post.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${postBurnType} 
              AND burn.burned_value > 0 
            GROUP BY
              post.id 
            ORDER by
              score desc
            LIMIT 1000;
          `
      );

      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `post-${post.id}`;
        pipeline.zadd(key, post.score, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async getOutNetwork() {
    const key = TimelineService.outNetworkSourceKey;
    const exist = await this.redis.exists([key]);

    if (!exist) {
      await this.cacheOutNetwork();
    }

    return await this.redis.zrevrange(key, 0, -1);
  }

  private mergeByRatio(arr1: string[], arr2: string[], ratio: number): string[] {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Ratio should be between 0 and 1");
    }

    const totalLength = Math.min(arr1.length + arr2.length, arr1.length / ratio);
    const countFromArr1 = Math.round(totalLength * ratio);
    const countFromArr2 = totalLength - countFromArr1;

    const result: string[] = [];
    const seen = new Set<string>();

    let i = 0, j = 0, k = 0;
    while (k < totalLength) {
      if (i < countFromArr1 && j < countFromArr2) {
        if (!seen.has(arr1[i])) {
          result.push(arr1[i]);
          seen.add(arr1[i]);
        }
        i++;
        if (!seen.has(arr2[j])) {
          result.push(arr2[j]);
          seen.add(arr2[j]);
        }
        j++;
      } else if (i < countFromArr1) {
        if (!seen.has(arr1[i])) {
          result.push(arr1[i]);
          seen.add(arr1[i]);
        }
        i++;
      } else if (j < countFromArr2) {
        if (!seen.has(arr2[j])) {
          result.push(arr2[j]);
          seen.add(arr2[j]);
        }
        j++;
      }
      k = i + j;
    }

    return result;
  }

  async getTimelineIdsByLevel(level: number, accountId: number, first: number = 20, after?: string): Promise<IPaginatedType<string>> {

    if (level < 1 || level > 5) {
      throw new Error("Level should be between 1 and 5");
    }

    const ratio = TimelineService.ratioSteps[level - 1];
    const key = `home_timeline:${accountId}:level:${level}`;
    const exist = await this.redis.exists([key]);

    if (!exist) {
      const inNetwork = await this.getInNetwork(accountId);
      const outNetwork = await this.getOutNetwork();
      const timeline = this.mergeByRatio(inNetwork, outNetwork, ratio);
      const pipeline = this.redis.pipeline();
      let index = 0;
      for (const item of timeline) {
        const id = `post-${item}`;
        pipeline.zadd(key, index, id);
        index += 1;
      }
      pipeline.expire(key, 86400);
      await pipeline.exec();
    }

    const totalCount = await this.redis.zcount(key, 0, 4000);
    if (after) {
      const startOffset = await this.redis.zrank(key, after);
      if (startOffset === null) {
        // Cannot find cursor in the sorted set
        return {
          totalCount,
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: after
          }
        };
      } else {
        const endOffset = startOffset + first;
        const ids = await this.redis.zrange(key, startOffset + 1, startOffset + first);
        const edges = ids.map((value, index) => {
          return {
            cursor: value,
            node: value
          };
        });
        const firstEdge = edges[0];
        const lastEdge = edges[edges.length - 1];
        return {
          totalCount,
          edges,
          pageInfo: {
            startCursor: firstEdge ? firstEdge.cursor : undefined,
            endCursor: lastEdge ? lastEdge.cursor : undefined,
            hasPreviousPage: true,
            hasNextPage: endOffset < totalCount
          }
        }
      }
    } else {
      // Get data from start
      const startOffset = 0;
      const endOffset = startOffset + first;
      const ids = await this.redis.zrange(key, startOffset + 1, startOffset + first);
      const edges = ids.map((value, index) => {
        return {
          cursor: value,
          node: value
        };
      });
      const firstEdge = edges[0];
      const lastEdge = edges[edges.length - 1];
      return {
        totalCount,
        edges,
        pageInfo: {
          startCursor: firstEdge ? firstEdge.cursor : undefined,
          endCursor: lastEdge ? lastEdge.cursor : undefined,
          hasPreviousPage: true,
          hasNextPage: endOffset < totalCount
        }
      }
    }
  }
}