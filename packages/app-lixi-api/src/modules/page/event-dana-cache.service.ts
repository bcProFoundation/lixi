import { EventDana } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:eventdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getEventDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.eventDana.findUnique({
        where: {
          eventId: id
        }
      });
      if (!dbValue) return null;

      const eventDana: EventDana = new EventDana({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(eventDana)));

      return eventDana;
    }
    return decode(buffer) as EventDana;
  }

  async setEventDana(id: string, eventDana: EventDana) {
    const buffer = Buffer.from(encode(eventDana));
    await this.redis.hset(this.keyPrefix, id, buffer);
  }

  async getEventDanas(ids: string[]) {
    const uncachedEventIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedEventIds.push(ids[i]);
      }
    }

    const eventDanasMap = new Map(
      _.compact(values).map(value => {
        const eventDana = decode(value) as EventDana;
        return [eventDana.eventId, eventDana];
      })
    );

    const dbValues =
      uncachedEventIds.length > 0
        ? await this.prisma.eventDana.findMany({
            where: {
              eventId: {
                in: uncachedEventIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const eventDana = new EventDana({
          ...dbValue
        });
        eventDanasMap.set(dbValue.eventId, eventDana);
        return [dbValue.eventId, Buffer.from(encode(eventDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const eventDana = eventDanasMap.get(id);
      return eventDana ? eventDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
