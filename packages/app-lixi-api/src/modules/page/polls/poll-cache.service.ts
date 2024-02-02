import { Poll, PollOption } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';

export class PollCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:polls:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Nullable<Poll>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.post.findUnique({
        where: {
          id: id
        },
        include: {
          poll: {
            include: {
              options: { include: { pollAnswerOnAccount: true } }
            }
          }
        }
      });
      if (!dbValue || !dbValue.poll) return null;

      const item: Poll = new Poll({
        ...dbValue.poll,
        question: dbValue.poll.question,
        startDate: dbValue.poll.startDate,
        endDate: dbValue.poll.endDate,
        options: dbValue.poll.options
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(item)));

      return item;
    }

    const item = decode(buffer) as Poll;
    return new Poll({ ...item });
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
        const item = decode(value) as Poll;
        return [item.postId, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.post.findMany({
            where: {
              id: { in: uncachedIds }
            },
            include: {
              poll: {
                include: {
                  options: { include: { pollAnswerOnAccount: true } }
                }
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        if (!dbValue || !dbValue.poll) return [undefined, undefined];

        const item = new Poll({
          ...dbValue.poll,
          question: dbValue.poll.question,
          startDate: dbValue.poll.startDate,
          endDate: dbValue.poll.endDate,
          options: dbValue.poll.options
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
      return item ? new Poll({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
