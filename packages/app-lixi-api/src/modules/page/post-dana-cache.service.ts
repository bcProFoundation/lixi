import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { decode, encode } from '@msgpack/msgpack';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { PageDana, PostDana } from '@bcpros/lixi-models';

@Injectable()
export class PostDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:postdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getPostDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.postDana.findUnique({
        where: {
          postId: id
        }
      });
      if (!dbValue) return null;

      const postDana: PostDana = new PostDana({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id.toString(), Buffer.from(encode(postDana)));

      return postDana;
    }
    return decode(buffer) as PostDana;
  }

  async setPostDana(id: string, postDana: PostDana) {
    const buffer = Buffer.from(encode(postDana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getPostDanas(ids: string[]) {
    const uncachedPostIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedPostIds.push(ids[i]);
      }
    }

    const postDanasMap = new Map(
      _.compact(values).map(value => {
        const postDana = decode(value) as PostDana;
        return [postDana.postId, postDana];
      })
    );

    const dbValues =
      uncachedPostIds.length > 0
        ? await this.prisma.postDana.findMany({
            where: {
              postId: {
                in: uncachedPostIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const postDana = new PostDana({
          ...dbValue
        });
        postDanasMap.set(dbValue.postId, postDana);
        return [dbValue.postId, Buffer.from(encode(postDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const postDana = postDanasMap.get(id);
      return postDana ? postDana : null;
    });
  }
}
