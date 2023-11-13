import { Pin } from '@bcpros/lixi-models';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { encode, decode } from '@msgpack/msgpack';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import _ from 'lodash';

@Injectable()
export class PinCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:pins:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Nullable<Pin>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbItem = await this.prisma.pin.findUnique({
        where: {
          id: id
        }
      });
      if (!dbItem) return null;

      const pin: Pin = new Pin({
        ...dbItem
      });
      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(pin)));
      return pin;
    }

    return decode(buffer) as Pin;
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Pin;
        return [item.id, item];
      })
    );
    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.pin.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const item = new Pin({
          ...dbValue
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
      return item ?? null;
    });
  }

  private async _cachePagePin(key: string, pageId: string) {
    const pin = await this.prisma.pin.findUnique({
      where: { pageId },
      include: { pinable: true }
    });

    if (pin) {
      const pinable = pin.pinable;
      const data = this.redis.zadd(key, pin.createdAt.getTime(), `${pinable?.type}:${pinable?.id}:${pin.id}`);

      return Promise.resolve(data);
    }
    return null;
  }

  private async _cacheAccountPin(key: string, accountId: number) {
    const pin = await this.prisma.pin.findUnique({
      where: { accountId },
      include: { pinable: true }
    });

    if (pin) {
      const pinable = pin.pinable;
      const data = this.redis.zadd(key, pin.createdAt.getTime(), `${pinable?.type}:${pinable?.id}:${pin.id}`);

      return Promise.resolve(data);
    }
    return null;
  }

  async getPagePin(pageId: string) {
    const key = `user:${pageId}:pin`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePagePin(key, pageId);
    }
    return await this.redis.zrevrange(key, 0, -1);
  }

  async getAccountPin(accountId: number) {
    const key = `user:${accountId}:pin`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountPin(key, accountId);
    }
    return await this.redis.zrevrange(key, 0, -1);
  }

  async removePagePin(pageId: string, pinId: string, pinableId: string, pinType: string) {
    const key = `user:${pageId}:pin`;
    await this.redis.zrem(key, `${pinType}:${pinableId}:${pinId}`);
  }

  async removeAccountePin(accountId: number, pinId: string, pinableId: string, pinType: string) {
    const key = `user:${accountId}:pin`;
    await this.redis.zrem(key, `${pinType}:${pinableId}:${pinId}`);
  }
}
