import { EventDana, PollDana } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PollDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:polldana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getPollDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.pollDana.findUnique({
        where: {
          pollId: id
        }
      });
      if (!dbValue) return null;

      const pollDana: PollDana = new PollDana({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(pollDana)));

      return pollDana;
    }
    return decode(buffer) as EventDana;
  }

  async setPollDana(id: string, pollDana: PollDana) {
    const buffer = Buffer.from(encode(pollDana));
    await this.redis.hset(this.keyPrefix, id, buffer);
  }

  async getPollDanas(ids: string[]) {
    const uncachedPollIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedPollIds.push(ids[i]);
      }
    }

    const pollDanasMap = new Map(
      _.compact(values).map(value => {
        const pollDana = decode(value) as PollDana;
        return [pollDana.pollId, pollDana];
      })
    );

    const dbValues =
      uncachedPollIds.length > 0
        ? await this.prisma.pollDana.findMany({
            where: {
              pollId: {
                in: uncachedPollIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const pollDana = new PollDana({
          ...dbValue
        });
        pollDanasMap.set(dbValue.pollId, pollDana);
        return [dbValue.pollId, Buffer.from(encode(pollDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const pollDana = pollDanasMap.get(id);
      return pollDana ? pollDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
