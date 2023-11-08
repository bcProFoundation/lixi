import { Token } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

export class TokenCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:tokens:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Token | null> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.token.findUnique({
        where: {
          id: id
        }
      });

      if (!dbValue) return null;

      const item: Token = new Token({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(item)));
      return item;
    }
    return decode(buffer) as Token;
  }

  async getByIds(ids: string[]): Promise<Nullable<Token>[]> {
    if (ids.length === 0) return [];

    const itemsMap = new Map();

    try {
      const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
      const uncachedIds = [];
      for (let i = 0; i < ids.length; i++) {
        if (!values[i]) {
          uncachedIds.push(ids[i]);
        }
      }

      _.compact(values).map(value => {
        const item = decode(value) as Token;
        itemsMap.set(item.id, item);
      });

      const dbValues =
        uncachedIds.length > 0
          ? await this.prisma.token.findMany({
              where: {
                id: { in: uncachedIds }
              }
            })
          : [];

      const dbValuesMap = new Map(
        dbValues.map(dbValue => {
          const item = new Token({
            ...dbValue
          });
          itemsMap.set(dbValue.id, item);
          const buffer = encode(item);
          return [dbValue.id, Buffer.from(buffer)];
        })
      );

      if (dbValuesMap.size > 0) {
        await this.redis.hmset(this.keyPrefix, dbValuesMap);
      }
    } catch (err) {
      this.logger.error(err);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? item : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
