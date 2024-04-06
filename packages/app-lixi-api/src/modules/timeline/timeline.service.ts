import { BurnForType, IPaginatedType } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { FollowCacheService } from '../account/follow-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import SortedSet from 'redis-sorted-set';
import { basicInMemorySortedSetPagination, basicSortedSetPagination } from '../../common/custom-graphql-relay/paginate';
import { template } from '../../utils/stringTemplate';

@Injectable()
export class TimelineService {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';
  static outNetworkSourceKey = 'timeline:outnetwork:source';
  static ratioSteps = [0.1, 0.3, 0.5, 0.7, 0.9];
  static profileTimelineKey = 'timeline:profile:{{profileId}}';
  static profileTimelineByTimeWithDanaFilterKey = 'timeline:profile:{{accountId}}:{{level}}';
  static profileTimelineByTimeShowAll = 'timeline:profile:{{accountId}}:showAll';
  static pageTimelineKey = 'timeline:page:{{pageId}}';
  static pageTimelineByTimeWithDanaFilterKey = 'timeline:page:{{pageId}}:{{level}}';
  static pageTimelineByTimeShowAll = 'timeline:page:{{pageId}}:showAll';
  static tokenTimelineKey = 'timeline:token:{{tokenId}}';
  static tokenTimelineByTimeWithDanaFilterKey = 'timeline:token:{{tokenId}}:{{level}}';
  static tokenTimelineByTimeShowAll = 'timeline:token:{{tokenId}}:showAll';

  constructor(
    private readonly prisma: PrismaService,
    private readonly followCacheService: FollowCacheService,
    @InjectRedis() private readonly redis: Redis,
    @I18n() private i18n: I18nService
  ) { }

  async cacheInNetworkByTime(accountId: number) {
    const key = `${TimelineService.inNetworkSourceKey}:${accountId}`;
    try {
      const accountFollowings = (await this.followCacheService.getAccountFollowings(accountId)).map(item =>
        _.toSafeInteger(item)
      );
      const pageFollowings = await this.followCacheService.getPageFollowings(accountId);
      // get all the post of the following accounts, order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          accountId: true,
          createdAt: true
        },
        where: {
          OR: [
            {
              pageId: {
                in: pageFollowings
              }
            },
            {
              accountId: {
                in: [accountId].concat(accountFollowings)
              }
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 500
      });

      const epoch = '2023-01-01 00:00:00';
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        const diffHour = moment.duration(moment(post.createdAt).diff(moment(epoch))).asHours();
        const score = 1 * Math.pow(2, diffHour / 12);
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
      let accountFollowings = (await this.followCacheService.getAccountFollowings(accountId)).map(item =>
        _.toSafeInteger(item)
      );
      accountFollowings = accountId ? [accountId].concat(accountFollowings) : accountFollowings;
      const pageFollowings = await this.followCacheService.getPageFollowings(accountId);

      if (
        (_.isNil(accountFollowings) || _.isEmpty(accountFollowings)) &&
        (_.isNil(pageFollowings) || _.isEmpty(pageFollowings))
      )
        return;

      const accountFollowingsCondition =
        !_.isNil(accountFollowings) && !_.isEmpty(accountFollowings) ? `${Prisma.join(accountFollowings)}` : '';
      const pageFollowingsCondition =
        !_.isNil(pageFollowings) && !_.isEmpty(pageFollowings) ? `${Prisma.join(pageFollowings)}` : '';

      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(
        Prisma.sql`
            SELECT
              post.id,
              post.type,
              total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
            FROM
              post 
              JOIN
                  burn 
                  ON post.id = burn.burned_for_id 
            WHERE
              burn.burn_for_type = ${postBurnType} 
              AND burn.burned_value > 0 
              AND (
                (post.account_id = ANY(ARRAY[${Prisma.join(accountFollowings)}]::int[])) OR
                (post.page_id IN (${pageFollowingsCondition} ))
              )
            GROUP BY
              post.id 
            ORDER by
              score desc
            LIMIT 500;
          `
      );
      // Note that the workaround for account_id = ANY instead of IN
      // https://github.com/prisma/prisma/issues/14978

      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
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

    return await this.redis.zrevrange(key, 0, -1, 'WITHSCORES');
  }

  async cacheOutNetwork() {
    const key = TimelineService.outNetworkSourceKey;
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    try {
      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(
        Prisma.sql`
            SELECT
              post.id,
              post.type,
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
        const id = `${post.type}:${post.id}`;
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

    return await this.redis.zrevrange(key, 0, -1, 'WITHSCORES');
  }

  private mergeByRatio(arr1: string[], arr2: string[], ratio: number): string[] {
    if (ratio < 0 || ratio > 1) {
      throw new Error('Ratio should be between 0 and 1');
    }

    const gcd = (x: number, y: number) => {
      x = Math.abs(x);
      y = Math.abs(y);
      while (y) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x;
    };

    // find the gcd from ratio
    const numOfArr1In10Items = Math.round(ratio * 10);
    const numOfArr2In10Items = 10 - numOfArr1In10Items;

    // Reduce to fraction
    const gcdValue = gcd(numOfArr1In10Items, numOfArr2In10Items);
    const numOfArr1ItemsEachBatch = numOfArr1In10Items / gcdValue;
    const numOfArr2ItemsEachBatch = numOfArr2In10Items / gcdValue;

    const result: string[] = [];
    const seen = new Set<string>();

    let i = 0,
      j = 0,
      k = 0;

    while (i < arr1.length && j < arr2.length) {
      const numOfItemsToInsertFromArr1 = Math.min(numOfArr1ItemsEachBatch, arr1.length - i);
      const numOfItemsToInsertFromArr2 = Math.min(numOfArr2ItemsEachBatch, arr2.length - j);

      k = 0;
      let index1 = 0; // the index to track pointer moving in arr1
      while (k < numOfItemsToInsertFromArr1 && i + index1 < arr1.length) {
        const item1 = arr1[i + index1];
        if (!seen.has(item1) && !_.isNil(item1)) {
          seen.add(item1);
          result.push(item1);
          k += 1;
        }
        index1 += 1;
      }
      i += numOfItemsToInsertFromArr1;

      k = 0;
      let index2 = 0; // the index to track pointer moving in arr2
      while (k < numOfItemsToInsertFromArr2 && j + index2 < arr2.length) {
        const item2 = arr2[j + index2];
        if (!seen.has(item2)) {
          seen.add(item2);
          result.push(item2);
          k += 1;
        }
        index2 += 1;
      }
      j += numOfItemsToInsertFromArr2;
    }

    if (i < arr1.length) {
      for (; i < arr1.length; i++) {
        const item = arr1[i];
        if (!seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
      }
    } else if (j < arr2.length) {
      for (; j < arr2.length; j++) {
        const item = arr2[j];
        if (!seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
      }
    }

    return result;
  }

  async getPaginatedTimeline(level: number, first: number = 20, accountId?: number, after?: string) {
    const timelineSortedSet = new SortedSet();

    if (level < 1 || level > 5) {
      return basicInMemorySortedSetPagination(timelineSortedSet, first, after);
    }

    const ratio = TimelineService.ratioSteps[level - 1];

    const inNetworkWithScores = accountId ? (await this.getInNetwork(accountId)) || [] : [];
    const outNetworkWithScores = await this.getOutNetwork();

    const maxScoreInNetwork = inNetworkWithScores.length > 1 ? inNetworkWithScores[1] : 0;
    const maxScoreOutNetwork = outNetworkWithScores.length > 1 ? outNetworkWithScores[1] : 0;

    const inNetwork = inNetworkWithScores.filter((item, index) => index % 2 === 0);
    const outNetwork = outNetworkWithScores.filter((item, index) => index % 2 === 0);

    const timeline =
      _.toNumber(maxScoreInNetwork) > _.toNumber(maxScoreOutNetwork)
        ? this.mergeByRatio(_.compact(inNetwork), _.compact(outNetwork), _.round(ratio, 1))
        : this.mergeByRatio(_.compact(outNetwork), _.compact(inNetwork), _.round(1 - ratio, 1));

    let index = 0;
    for (const id of timeline) {
      timelineSortedSet.add(id, index);
      index += 1;
    }

    return basicInMemorySortedSetPagination(timelineSortedSet, first, after);
  }

  async getPagePaginatedTimeline(pageId: string, first: number = 20, after?: string) {
    const key = template(`${TimelineService.pageTimelineKey}`, { pageId: pageId });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimelineByScore(pageId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cachePageTimelineByScore(pageId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getPagePaginatedTimelineByTimeShowAll(pageId: string, first: number = 20, after?: string) {
    const key = template(`${TimelineService.pageTimelineByTimeShowAll}`, {
      pageId: pageId
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimelineByTimeShowAll(pageId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cachePageTimelineByTimeShowAll(pageId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getPagePaginatedTimelineByTimeWithDanaFilter(
    pageId: string,
    level: number,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${TimelineService.pageTimelineByTimeWithDanaFilterKey}`, { pageId: pageId, level: level });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimelineByTimeWithDanaFilter(pageId, level, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cachePageTimelineByTimeWithDanaFilter(pageId, level, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getTokenPaginatedTimeline(tokenId: string, first: number = 20, after?: string) {
    const key = template(`${TimelineService.tokenTimelineKey}`, { tokenId: tokenId });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cachePageTimelineByScore(tokenId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheTokenTimelineByScore(tokenId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getTokenPaginatedTimelineByTimeShowAll(tokenId: string, first: number = 20, after?: string) {
    const key = template(`${TimelineService.tokenTimelineByTimeShowAll}`, {
      tokenId: tokenId
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheTokenTimelineByTimeShowAll(tokenId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheTokenTimelineByTimeShowAll(tokenId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getTokenPaginatedTimelineByTimeWithDanaFilter(
    tokenId: string,
    level: number,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${TimelineService.tokenTimelineByTimeWithDanaFilterKey}`, { tokenId: tokenId, level: level });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheTokenTimelineByTimeWithDanaFilter(tokenId, level, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheTokenTimelineByTimeWithDanaFilter(tokenId, level, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getProfilePaginatedTimeline(profileId: number, first: number = 20, after?: string) {
    const key = template(`${TimelineService.profileTimelineKey}`, { profileId: profileId });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheProfileTimelineByScore(profileId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheProfileTimelineByScore(profileId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getProfilePaginatedTimelineByTimeShowAll(accountId: number, first: number = 20, after?: string) {
    const key = template(`${TimelineService.profileTimelineByTimeShowAll}`, {
      accountId: accountId
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheProfileTimelineByTimeShowAll(accountId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheProfileTimelineByTimeShowAll(accountId, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getProfilePaginatedTimelineByTimeWithDanaFilter(
    accountId: number,
    level: number,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${TimelineService.profileTimelineByTimeWithDanaFilterKey}`, {
      accountId: accountId,
      level: level
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheProfileTimelineByTimeWithDanaFilter(accountId, level, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheProfileTimelineByTimeWithDanaFilter(accountId, level, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  private async cachePageTimelineByTimeWithDanaFilter(
    pageId: string,
    level: number,
    limit: number = 0,
    offset: number = 0
  ) {
    const key = template(`${TimelineService.pageTimelineByTimeWithDanaFilterKey}`, { pageId: pageId, level: level });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          AND: [
            {
              pageId: pageId
            },
            {
              dana: {
                danaReceivedScore: {
                  gte: level
                }
              }
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cachePageTimelineByTimeShowAll(pageId: string, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.pageTimelineByTimeShowAll}`, { pageId: pageId });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          pageId: pageId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheProfileTimelineByTimeWithDanaFilter(
    accountId: number,
    level: number,
    limit: number = 0,
    offset: number = 0
  ) {
    const key = template(`${TimelineService.profileTimelineByTimeWithDanaFilterKey}`, {
      accountId: accountId,
      level: level
    });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          AND: [
            {
              accountId: accountId
            },
            {
              dana: {
                danaReceivedScore: {
                  gte: level
                }
              }
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheProfileTimelineByTimeShowAll(accountId: number, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.profileTimelineByTimeShowAll}`, { accountId: accountId });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          accountId: accountId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheTokenTimelineByTimeWithDanaFilter(
    tokenId: string,
    level: number,
    limit: number = 0,
    offset: number = 0
  ) {
    const key = template(`${TimelineService.tokenTimelineByTimeWithDanaFilterKey}`, { tokenId: tokenId, level: level });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          AND: [
            {
              tokenId: tokenId
            },
            {
              dana: {
                danaReceivedScore: {
                  gte: level
                }
              }
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheTokenTimelineByTimeShowAll(tokenId: string, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.tokenTimelineByTimeShowAll}`, { tokenId: tokenId });
    try {
      //query all posts in page where level = level order by time
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          tokenId: tokenId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cachePageTimelineByScore(pageId: string, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.pageTimelineKey}`, { pageId: pageId });
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.page_id = ${pageId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      LIMIT ${limit}
      OFFSET ${offset}
    ;
  `
      : Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.page_id = ${pageId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      OFFSET ${offset}
      ;
    `;
    try {
      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheTokenTimelineByScore(tokenId: string, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.tokenTimelineKey}`, { tokenId: tokenId });
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.token_id = ${tokenId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      LIMIT ${limit}
      OFFSET ${offset}
    ;
  `
      : Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.token_id = ${tokenId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      OFFSET ${offset}
      ;
    `;
    try {
      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheProfileTimelineByScore(profileId: number, limit: number = 0, offset: number = 0) {
    const key = template(`${TimelineService.profileTimelineKey}`, { profileId: profileId });
    const postBurnType = BurnForType.Post;
    const epoch = '2023-01-01 00:00:00';
    const halfLife = '12 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.account_id = ${profileId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      LIMIT ${limit}
      OFFSET ${offset}
    ;
  `
      : Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(burn.burn_type, burn.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, burn.burned_value)) AS score 
      FROM
        post 
        JOIN
            burn 
            ON post.id = burn.burned_for_id 
      WHERE
        burn.burn_for_type = ${postBurnType} 
        AND burn.burned_value > 0 
        AND post.account_id = ${profileId}
      GROUP BY
        post.id 
      ORDER by
        score desc
      OFFSET ${offset}
      ;
    `;
    try {
      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
