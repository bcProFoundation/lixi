import { Dispute, DisputeStatus } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { template } from 'src/utils/stringTemplate';

export class DisputeCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:dispute:item-data';

  //timeline
  static myDisputeTimeline = 'timeline:dispute:{{accountId}}:{{disputeStatus}}';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<Dispute>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.dispute.findUnique({
        where: {
          id: id
        }
      });
      if (!dbValue) return null;

      const dispute: Dispute = new Dispute({
        ...dbValue,
        status: dbValue?.status as DisputeStatus
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(dispute)));

      return dispute;
    }

    const dispute = decode(buffer) as Dispute;
    return new Dispute({ ...dispute });
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
        const item = decode(value) as Dispute;
        return [item.id, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.dispute.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new Dispute({
          ...dbValue,
          status: dbValue?.status as DisputeStatus
        });
        itemsMap.set(dbValue.id, item);
        return [dbValue.id, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? new Dispute({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }

  async getPaginatedMyDisputeTimelineByTime(
    accountId: number,
    disputeStatus: DisputeStatus,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${DisputeCacheService.myDisputeTimeline}`, { accountId, disputeStatus });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheMyDisputeTimelineByTime(accountId, disputeStatus, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheMyDisputeTimelineByTime(accountId, disputeStatus, limit, after);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  private async cacheMyDisputeTimelineByTime(
    accountId: number,
    disputeStatus: DisputeStatus,
    limit: number = 0,
    cursor?: string
  ) {
    const key = template(`${DisputeCacheService.myDisputeTimeline}`, { accountId, disputeStatus });
    try {
      //query all dispute with of account
      const posts = cursor
        ? await this.prisma.dispute.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              escrowOrder: {
                OR: [{ buyerAccountId: accountId }, { sellerAccountId: accountId }]
              },
              status: disputeStatus
            },
            orderBy: {
              createdAt: 'desc'
            },
            cursor: { id: cursor ? cursor : undefined },
            take: limit,
            skip: 1
          })
        : await this.prisma.dispute.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              escrowOrder: {
                OR: [{ buyerAccountId: accountId }, { sellerAccountId: accountId }]
              },
              status: disputeStatus
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: limit
          });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = post.id;
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
