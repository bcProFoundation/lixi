import { BurnItem } from '@bcpros/lixi-models';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { template } from 'src/utils/stringTemplate';
import { decode, encode } from '@msgpack/msgpack';
import _ from 'lodash';
import { XPIJS } from '../wallet/wallet.constants';
import BCHJS from '@bcpros/xpi-js';

@Injectable()
export class BurnHistoryCacheService {
  private logger: Logger = new Logger(this.constructor.name);

  static burnTimeline = 'timeline:burn:{{postId}}';
  static KeyBurnItem = 'items:burns:item-data';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    @Inject(XPIJS) private XPI: BCHJS
  ) {}

  async getById(id: string) {
    const buffer = await this.redis.hgetBuffer(BurnHistoryCacheService.KeyBurnItem, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.burn.findUnique({
        where: {
          id
        }
      });
      if (!dbValue) return null;

      const burnData: BurnItem = new BurnItem({
        ...dbValue,
        burnedBy: dbValue?.burnedBy.toString('hex')
      });
      await this.redis.hset(BurnHistoryCacheService.KeyBurnItem, id, Buffer.from(encode(burnData)));
      return burnData;
    }

    const burn = new BurnItem({ ...(decode(buffer) as BurnItem) });
    return burn;
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const burnsMap = new Map();

    try {
      const values = await this.redis.hmgetBuffer(BurnHistoryCacheService.KeyBurnItem, ...ids);
      const uncachedIds: string[] = [];
      for (let i = 0; i < ids.length; i++) {
        if (!values[i]) {
          uncachedIds.push(ids[i]);
        }
      }
      _.compact(values).map(value => {
        const burnData = decode(value) as BurnItem;
        burnsMap.set(burnData.id, burnData);
      });

      const dbValues =
        uncachedIds.length > 0
          ? await this.prisma.burn.findMany({
              where: {
                id: { in: uncachedIds }
              }
            })
          : [];

      const dbValuesMap = new Map(
        dbValues.map(dbValue => {
          const burnItem = new BurnItem({
            ...dbValue,
            burnedBy: dbValue?.burnedBy.toString('hex')
          });
          burnsMap.set(dbValue.id, burnItem);
          const buffer = encode(burnItem);
          return [dbValue.id, Buffer.from(buffer)];
        })
      );

      if (dbValuesMap.size > 0) {
        this.redis.hmset(BurnHistoryCacheService.KeyBurnItem, dbValuesMap);
      }
    } catch (err) {
      this.logger.error(err);
    }

    return ids.map(id => {
      const burnItem = burnsMap.get(id);
      return burnItem ? new BurnItem({ ...burnItem }) : null;
    });
  }

  async getPaginatedPostBurnTimeline(id: string, first: number = 20, after?: string) {
    const key = template(`${BurnHistoryCacheService.burnTimeline}`, { postId: id });
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePostBurnTimeline(id, key, after);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    //cache again for sure
    if (!hasNextPage) {
      const shouldPaginated = await this._cachePostBurnTimeline(id, key, after);
      if (shouldPaginated) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    //nothing change
    return paginated;
  }

  async _cachePostBurnTimeline(id: string, key: string, after?: string) {
    try {
      const listBurnHistory = await this.prisma.burn.findMany({
        where: { burnForId: id },
        orderBy: { createdAt: 'desc' },
        cursor: after ? { id: after } : undefined,
        take: 1000
      });

      //check post have burn
      if (listBurnHistory.length === 0) return false;

      const pipeline = this.redis.pipeline();

      for (const burnData of listBurnHistory) {
        pipeline.zadd(key, burnData.createdAt?.getTime() ?? 0, burnData.id);
      }

      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async _cacheBurnOfPost(key: string, postId: string) {
    const burns = await this.prisma.burn.findMany({
      where: {
        burnForId: postId
      },
      select: { burnedBy: true, createdAt: true }
    });

    const promises = [];
    for (const burn of burns) {
      promises.push(this.redis.zadd(key, new Date(burn.createdAt ?? 0).getTime(), burn.burnedBy.toString('hex')!));
    }

    if (_.isNil(promises) || promises.length === 0) return null;

    return Promise.all(promises);
  }

  async checkPostBurnByOthers(items: { postId: string; accountAddress: string }[]) {
    const result = items.map(async item => {
      const { postId, accountAddress } = item;
      let postBurnByOthers;
      const key = `post:${postId}:burnAddress`;
      const exist = await this.redis.exists([key]);
      if (!exist) {
        postBurnByOthers = await this._cacheBurnOfPost(key, postId);
      }

      //post has no burn
      if (postBurnByOthers === null) {
        return false;
      } else {
        //check post has burn of others
        const numberBurnPost = await this.redis.zcard(key);
        if (numberBurnPost > 1) {
          return true;
        } else if (numberBurnPost === 1) {
          return !(await this.redis.zscore(key, this.XPI.Address.toHash160(accountAddress)));
        }
      }
    });

    return Promise.all(result);
  }
}
