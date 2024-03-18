import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { PageDana } from '@bcpros/lixi-models';

@Injectable()
export class PageDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:pages:dana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getPageDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.pageDana.findUnique({
        where: {
          pageId: id
        }
      });
      if (!dbValue) return null;

      const pageDana: PageDana = new PageDana({
        ...dbValue
      });

      await this.redis.hset(this.keyPrefix, id.toString(), Buffer.from(encode(pageDana)));

      return pageDana;
    }
    return decode(buffer) as PageDana;
  }

  async setPageDana(id: string, pageDana: PageDana) {
    const buffer = Buffer.from(encode(pageDana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getPageDanas(ids: string[]) {
    const uncachedPageIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedPageIds.push(ids[i]);
      }
    }

    const pageDanasMap = new Map(
      _.compact(values).map(value => {
        const pageDana = decode(value) as PageDana;
        return [pageDana.pageId, pageDana];
      })
    );

    const dbValues =
      uncachedPageIds.length > 0
        ? await this.prisma.pageDana.findMany({
          where: {
            pageId: {
              in: uncachedPageIds
            }
          }
        })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const pageDana = new PageDana({
          ...dbValue
        });
        pageDanasMap.set(dbValue.pageId, pageDana);
        return [dbValue.pageId, Buffer.from(encode(pageDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const pageDana = pageDanasMap.get(id);
      return pageDana ? pageDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
