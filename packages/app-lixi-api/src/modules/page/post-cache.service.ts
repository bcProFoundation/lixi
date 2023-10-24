import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '@bcpros/lixi-models';

export class PostCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:post:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Nullable<Post>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbItem = await this.prisma.post.findUnique({
        where: {
          id: id
        }
      });
      if (!dbItem) return null;

      const post: Post = new Post({
        ...dbItem
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(post)));

      return post;
    }

    return decode(buffer) as Post;
  }

  async getByIds(ids: string[]) {
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Post;
        return [item.id, item];
      })
    );
    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.post.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const item = new Post({
          ...dbValue
        });
        itemsMap.set(dbValue.id, item);
        return [dbValue.id, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    await this.redis.hmset(this.keyPrefix, dbValuesMap);

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ?? null;
    });
  }
}
