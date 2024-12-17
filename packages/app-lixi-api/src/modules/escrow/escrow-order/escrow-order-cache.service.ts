import { EscrowOrder, EscrowOrderStatus } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { template } from 'src/utils/stringTemplate';
import { TIMELINE_ESCROW_ORDER } from '../escrow.contants';

export class EscrowOrderCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:escrowOrders:item-data';

  //timeline
  static myEscrowOrderTimeline = 'timeline:escrowOrders:{{accountId}}:{{escrowOrderStatus}}';
  static escrowOrderByOfferIdTimeline = 'timeline:escrowOrders:{{accountId}}:{{offerId}}:{{escrowOrderStatus}}';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<EscrowOrder>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.escrowOrder.findUnique({
        where: {
          id: id
        }
      });
      if (!dbValue) return null;

      const escrowOrder: EscrowOrder = new EscrowOrder({
        ...dbValue,
        status: dbValue?.status as EscrowOrderStatus,
        escrowScript: dbValue.escrowScript.toString('hex')
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(escrowOrder)));

      return escrowOrder;
    }

    const escrowOrder = decode(buffer) as EscrowOrder;
    return new EscrowOrder({ ...escrowOrder });
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
        const item = decode(value) as EscrowOrder;
        return [item.id, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.escrowOrder.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new EscrowOrder({
          ...dbValue,
          status: dbValue?.status as EscrowOrderStatus,
          escrowScript: dbValue.escrowScript.toString('hex')
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
      return item ? new EscrowOrder({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }

  async getPaginatedMyEscrowOrderTimelineByTime(
    accountId: number,
    escrowOrderStatus: EscrowOrderStatus,
    first: number = 20,
    after?: string
  ) {
    //split 2 timeline: active (active - pending - escrow) : unactive (complete - cancle)
    let keyEscrowOrderStatus = '';
    if (
      escrowOrderStatus === EscrowOrderStatus.ACTIVE ||
      escrowOrderStatus === EscrowOrderStatus.ESCROW ||
      escrowOrderStatus === EscrowOrderStatus.PENDING
    ) {
      keyEscrowOrderStatus = TIMELINE_ESCROW_ORDER.active;
    } else {
      keyEscrowOrderStatus = TIMELINE_ESCROW_ORDER.unactive;
    }

    const key = template(`${EscrowOrderCacheService.myEscrowOrderTimeline}`, {
      accountId,
      escrowOrderStatus: keyEscrowOrderStatus
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheMyEscrowOrderTimelineByTime(accountId, keyEscrowOrderStatus, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheMyEscrowOrderTimelineByTime(accountId, keyEscrowOrderStatus, limit, after);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }
  async getPaginatedEscrowOrderByOfferIdTimelineByTime(
    offerId: string,
    escrowOrderStatus: EscrowOrderStatus,
    accountId: number,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${EscrowOrderCacheService.escrowOrderByOfferIdTimeline}`, {
      accountId,
      offerId,
      escrowOrderStatus
    });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheEscrowOrderByOfferIdTimelineByTime(offerId, escrowOrderStatus, accountId, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheEscrowOrderByOfferIdTimelineByTime(
        offerId,
        escrowOrderStatus,
        accountId,
        limit,
        after
      );
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  private async cacheMyEscrowOrderTimelineByTime(
    accountId: number,
    keyEscrowOrderStatus: string,
    limit: number = 0,
    cursor?: string
  ) {
    const key = template(`${EscrowOrderCacheService.myEscrowOrderTimeline}`, {
      accountId,
      escrowOrderStatus: keyEscrowOrderStatus
    });
    try {
      //query all escrow-order with of account
      const posts = cursor
        ? await this.prisma.escrowOrder.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              buyerAccountId: accountId,
              OR:
                keyEscrowOrderStatus === TIMELINE_ESCROW_ORDER.active
                  ? [{ status: 'ACTIVE' }, { status: 'PENDING' }, { status: 'ESCROW' }]
                  : [{ status: 'CANCEL' }, { status: 'COMPLETE' }]
            },
            orderBy: {
              createdAt: 'desc'
            },
            cursor: { id: cursor ? cursor : undefined },
            take: limit,
            skip: 1
          })
        : await this.prisma.escrowOrder.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              buyerAccountId: accountId,
              OR:
                keyEscrowOrderStatus === TIMELINE_ESCROW_ORDER.active
                  ? [{ status: 'ACTIVE' }, { status: 'PENDING' }, { status: 'ESCROW' }]
                  : [{ status: 'CANCEL' }, { status: 'COMPLETE' }]
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
  private async cacheEscrowOrderByOfferIdTimelineByTime(
    offerId: string,
    escrowOrderStatus: EscrowOrderStatus,
    accountId: number,
    limit: number = 0,
    cursor?: string
  ) {
    const key = template(`${EscrowOrderCacheService.escrowOrderByOfferIdTimeline}`, {
      accountId,
      offerId,
      escrowOrderStatus
    });
    try {
      //query all escrow-order with of account
      const posts = cursor
        ? await this.prisma.escrowOrder.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              offerId: offerId,
              status: escrowOrderStatus,
              sellerAccountId: accountId
            },
            orderBy: {
              createdAt: 'desc'
            },
            cursor: { id: cursor ? cursor : undefined },
            take: limit,
            skip: 1 // skip cursor item
          })
        : await this.prisma.escrowOrder.findMany({
            select: {
              id: true,
              createdAt: true
            },
            where: {
              offerId: offerId,
              status: escrowOrderStatus,
              sellerAccountId: accountId
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

  async updateMyEscrowOrderTimelineCache(escrowId: string, escrowOrderUpdatedAt: Date, accountId: number) {
    try {
      const keyEscrowOrderStatusActive = TIMELINE_ESCROW_ORDER.active;
      const keyEscrowOrderStatusInactive = TIMELINE_ESCROW_ORDER.unactive;

      const myEscrowOrderTimelineKeyToAdd = template(`${EscrowOrderCacheService.myEscrowOrderTimeline}`, {
        accountId,
        escrowOrderStatus: keyEscrowOrderStatusInactive
      });

      const myEscrowOrderTimelineKeyToRemove = template(`${EscrowOrderCacheService.myEscrowOrderTimeline}`, {
        accountId,
        escrowOrderStatus: keyEscrowOrderStatusActive
      });

      const pipeline = this.redis.pipeline();

      //remove from active
      pipeline.zrem(myEscrowOrderTimelineKeyToRemove, escrowId);

      //add to inactice
      pipeline.zincrby(myEscrowOrderTimelineKeyToAdd, escrowOrderUpdatedAt.getTime(), escrowId);

      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async updateEscrowOrderByOfferIdCache(
    sellerAccountId: number,
    escrowId: string,
    escrowOrderUpdatedAt: Date,
    offerId: string,
    prevEscrowOrderStatus: EscrowOrderStatus,
    latestEscrowOrderStatus: EscrowOrderStatus
  ) {
    try {
      const escrowOrderByOfferIdKeyToAdd = template(`${EscrowOrderCacheService.escrowOrderByOfferIdTimeline}`, {
        sellerAccountId,
        offerId,
        escrowOrderStatus: latestEscrowOrderStatus
      });

      const escrowOrderByOfferIdKeyToRemove = template(`${EscrowOrderCacheService.escrowOrderByOfferIdTimeline}`, {
        sellerAccountId,
        offerId,
        escrowOrderStatus: prevEscrowOrderStatus
      });

      const pipeline = this.redis.pipeline();

      //remove from active
      pipeline.zrem(escrowOrderByOfferIdKeyToRemove, escrowId);

      //add to inactice
      pipeline.zincrby(escrowOrderByOfferIdKeyToAdd, escrowOrderUpdatedAt.getTime(), escrowId);

      await pipeline.exec();
    } catch (err) {
      this.logger.error(err);
    }
  }
}
