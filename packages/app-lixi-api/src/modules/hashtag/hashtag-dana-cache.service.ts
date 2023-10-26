import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagDana } from '@bcpros/lixi-models';

@Injectable()
export class HashtagDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:hashtagdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getHashtagDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.hashtagDana.findUnique({
        where: {
          hashtagId: id
        }
      });
      if (!dbValue) return null;

      const hashtagDana: HashtagDana = new HashtagDana({
        ...dbValue
      });

      const buffer = Buffer.from(encode(hashtagDana));
      await this.redis.hset(this.keyPrefix, id.toString(), buffer);

      return hashtagDana;
    }
    return decode(buffer) as HashtagDana;
  }

  async setHashtagDana(id: string, hashtagDana: HashtagDana) {
    const buffer = Buffer.from(encode(hashtagDana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getHashtagDanas(ids: string[]) {
    const uncachedHashtagIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedHashtagIds.push(ids[i]);
      }
    }

    const hashtagDanasMap = new Map(
      _.compact(values).map(value => {
        const hashtagDana = decode(value) as HashtagDana;
        return [hashtagDana.hashtagId, hashtagDana];
      })
    );

    const dbValues =
      uncachedHashtagIds.length > 0
        ? await this.prisma.hashtagDana.findMany({
            where: {
              hashtagId: {
                in: uncachedHashtagIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const hashtagDana = new HashtagDana({
          ...dbValue
        });
        hashtagDanasMap.set(dbValue.hashtagId, hashtagDana);
        const buffer = Buffer.from(encode(hashtagDana));
        return [dbValue.hashtagId, buffer];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const hashtagDana = hashtagDanasMap.get(id);
      return hashtagDana ? hashtagDana : null;
    });
  }
}
