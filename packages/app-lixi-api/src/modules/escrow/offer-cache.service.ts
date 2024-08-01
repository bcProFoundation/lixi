import { BoostForType, COIN, Offer, OfferStatus, OfferType } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { Prisma } from '@bcpros/lixi-prisma';
import { epoch } from 'src/utils/constants';
import { template } from 'src/utils/stringTemplate';

export class OfferCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:offers:item-data';
  static offerTimeline = 'timeline:offer:showAll';
  static myOfferTimeline = 'timeline:offer:{{publicKey}}';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<Offer>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.offer.findUnique({
        where: {
          postId: id
        }
      });
      if (!dbValue) return null;

      const offer: Offer = new Offer({
        ...dbValue,
        coin: dbValue?.coin as COIN,
        type: dbValue?.type as OfferType,
        status: dbValue?.status as OfferStatus
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(offer)));

      return offer;
    }

    const offer = decode(buffer) as Offer;
    return new Offer({ ...offer });
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i] && ids[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Offer;
        return [item.postId, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.offer.findMany({
            where: {
              postId: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new Offer({
          ...dbValue,
          coin: dbValue?.coin as COIN,
          type: dbValue?.type as OfferType,
          status: dbValue?.status as OfferStatus
        });
        itemsMap.set(dbValue.postId, item);
        return [dbValue.postId, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? new Offer({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }

  async getOfferPaginatedTimeline(first: number = 20, after?: string) {
    const key = OfferCacheService.offerTimeline;
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheOfferTimelineByScore(limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheOfferTimelineByScore(limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getPaginatedMyOfferTimelineByTime(publicKey: string, first: number = 20, after?: string) {
    const key = template(`${OfferCacheService.myOfferTimeline}`, { publicKey });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheMyOfferTimelineByTime(publicKey, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheMyOfferTimelineByTime(publicKey, limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  private async cacheOfferTimelineByScore(limit: number = 0, offset: number = 0) {
    const key = OfferCacheService.offerTimeline;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
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
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
      WHERE
      boost.boost_for_type = ${postBoostType} 
      AND boost.boosted_value > 0
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

  private async cacheMyOfferTimelineByTime(publicKey: string, limit: number = 0, offset: number = 0) {
    const key = template(`${OfferCacheService.myOfferTimeline}`, { publicKey });
    try {
      //query all post with public key of offer
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          type: true,
          createdAt: true
        },
        where: {
          offer: {
            publicKey
          }
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
}
