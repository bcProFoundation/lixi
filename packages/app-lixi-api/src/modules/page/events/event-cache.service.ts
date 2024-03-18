import { Event, Poll } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';

export class EventCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:events:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getById(id: string): Promise<Nullable<Event>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.post.findUnique({
        where: {
          id: id
        },
        include: {
          event: true
        }
      });
      if (!dbValue || !dbValue.event) return null;

      const item: Event = new Event({
        ...dbValue,
        name: dbValue.event.name,
        startDate: dbValue.event.startDate,
        endDate: dbValue.event.endDate,
        eventType: dbValue.event.eventType,
        description: dbValue.event.description || ''
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(item)));

      return item;
    }

    const item = decode(buffer) as Event;
    return new Event({ ...item });
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
        const item = decode(value) as Event;
        return [item.id, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.post.findMany({
          where: {
            id: { in: uncachedIds }
          },
          include: {
            event: true
          }
        })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        if (!dbValue || !dbValue.event) return [dbValue.id, null];
        const item = new Event({
          ...dbValue,
          name: dbValue.event.name,
          startDate: dbValue.event.startDate,
          endDate: dbValue.event.endDate,
          eventType: dbValue.event.eventType,
          description: dbValue.event.description || ''
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
      return item ? new Event({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
