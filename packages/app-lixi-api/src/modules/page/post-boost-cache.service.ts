import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { decode, encode } from '@msgpack/msgpack';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { PostBoost } from '@bcpros/lixi-models';

@Injectable()
export class PostBoostCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:offers:boost';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getPostBoost(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.postBoostScore.findUnique({
        where: {
          postId: id
        }
      });
      if (!dbValue) return null;

      const postBoost: PostBoost = new PostBoost({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id.toString(), Buffer.from(encode(postBoost)));

      return postBoost;
    }
    return decode(buffer) as PostBoost;
  }

  async setPostBoost(id: string, postBoost: PostBoost) {
    const buffer = Buffer.from(encode(postBoost));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getPostBoosts(ids: string[]) {
    const uncachedPostIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedPostIds.push(ids[i]);
      }
    }

    const postBoostsMap = new Map(
      _.compact(values).map(value => {
        const postBoost = decode(value) as PostBoost;
        return [postBoost.postId, postBoost];
      })
    );

    const dbValues =
      uncachedPostIds.length > 0
        ? await this.prisma.postBoostScore.findMany({
            where: {
              postId: {
                in: uncachedPostIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const postBoost = new PostBoost({
          ...dbValue
        });
        postBoostsMap.set(dbValue.postId, postBoost);
        return [dbValue.postId, Buffer.from(encode(postBoost))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const postBoost = postBoostsMap.get(id);
      return postBoost ? postBoost : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
