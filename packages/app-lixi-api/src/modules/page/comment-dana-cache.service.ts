import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { PrismaService } from '../prisma/prisma.service';
import { CommentDana } from '@bcpros/lixi-models';

@Injectable()
export class CommentDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:commentdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getCommentDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.commentDana.findUnique({
        where: {
          commentId: id
        }
      });
      if (!dbValue) return null;

      const pageDana: CommentDana = new CommentDana({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(pageDana)));

      return pageDana;
    }
    return decode(buffer) as CommentDana;
  }

  async setCommentDana(id: string, pageDana: CommentDana) {
    const buffer = Buffer.from(encode(pageDana));
    await this.redis.hset(this.keyPrefix, id, buffer);
  }

  async getCommentDanas(ids: string[]) {
    const uncachedCommentIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedCommentIds.push(ids[i]);
      }
    }

    const commentDanasMap = new Map(
      _.compact(values).map(value => {
        const commentDana = decode(value) as CommentDana;
        return [commentDana.commentId, commentDana];
      })
    );

    const dbValues =
      uncachedCommentIds.length > 0
        ? await this.prisma.commentDana.findMany({
          where: {
            commentId: {
              in: uncachedCommentIds
            }
          }
        })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const commentDana = new CommentDana({
          ...dbValue
        });
        commentDanasMap.set(dbValue.commentId, commentDana);

        return [dbValue.commentId, Buffer.from(encode(commentDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const commentDana = commentDanasMap.get(id);
      return commentDana ? commentDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
