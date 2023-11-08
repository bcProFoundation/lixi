import { Comment } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

export class CommentCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:comments:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Nullable<Comment>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbComment = await this.prisma.comment.findUnique({
        where: {
          id: id
        }
      });
      if (!dbComment) return null;

      const comment: Comment = new Comment({
        ...dbComment
      });
      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(comment)));
      return comment;
    }

    return decode(buffer) as Comment;
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
        const item = decode(value) as Comment;
        return [item.id, item];
      })
    );
    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.comment.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const comment = new Comment({
          ...dbValue
        });
        itemsMap.set(dbValue.id, comment);
        return [dbValue.id, Buffer.from(encode(comment))];
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
}
