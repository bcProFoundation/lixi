import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PageDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:pagedana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getPageDana(id: string) {
    const keyFields = [
      `danaReceivedUp:${id}`,
      `danaReceivedDown:${id}`,
      `danaReceivedScore:${id}`,
      `danaBurnUp:${id}`,
      `danaBurnDown:${id}`,
      `danaBurnScore:${id}`
    ];
    const pageDana = await this.redis.hmget(this.keyPrefix, ...keyFields);
    if (
      _.isNil(pageDana[0]) ||
      _.isNil(pageDana[1]) ||
      _.isNil(pageDana[2]) ||
      _.isNil(pageDana[3]) ||
      _.isNil(pageDana[4]) ||
      _.isNil(pageDana[5])
    ) {
      // No value set yet
      const dbValue = await this.prisma.pageDana.findUnique({
        where: {
          pageId: id
        }
      });
      const fieldValues = new Map([
        [`danaReceivedUp:${id}`, dbValue?.danaReceivedUp ?? 0],
        [`danaReceivedDown:${id}`, dbValue?.danaReceivedDown ?? 0],
        [`danaReceivedScore:${id}`, dbValue?.danaReceivedScore ?? 0],
        [`danaBurnUp:${id}`, dbValue?.danaBurnUp ?? 0],
        [`danaBurnDown:${id}`, dbValue?.danaBurnDown ?? 0],
        [`danaBurnScore:${id}`, dbValue?.danaBurnScore ?? 0]
      ]);
      await this.redis.hmset(this.keyPrefix, fieldValues);

      return {
        danaReceivedUp: dbValue?.danaReceivedUp ?? 0,
        danaReceivedDown: dbValue?.danaReceivedDown ?? 0,
        danaReceivedScore: dbValue?.danaReceivedScore ?? 0,
        danaBurnUp: dbValue?.danaBurnUp ?? 0,
        danaBurnDown: dbValue?.danaBurnDown ?? 0,
        danaBurnScore: dbValue?.danaBurnScore ?? 0
      };
    }
    return {
      danaReceivedUp: pageDana[0] ?? 0,
      danaReceivedDown: pageDana[1] ?? 0,
      danaReceivedScore: pageDana[2] ?? 0,
      danaBurnUp: pageDana[3] ?? 0,
      danaBurnDown: pageDana[4] ?? 0,
      danaBurnScore: pageDana[5] ?? 0
    };
  }

  async incrDana(id: string, value: number) {
    const danaBurnUpField = `danaBurnUp:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnUpField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value)
    ]);
  }

  async decrDana(id: string, value: number) {
    const danaBurnDownField = `danaBurnDown:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnDownField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value * -1)
    ]);
  }

  async incrDanaReceived(id: string, value: number) {
    const danaReceivedUpField = `danaReceivedUp:${id}`;
    const danaReceivedScoreField = `danaReceivedScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaReceivedUpField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaReceivedScoreField, value)
    ]);
  }

  async decrDanaReceived(id: string, value: number) {
    const danaReceivedDownField = `danaReceivedDown:${id}`;
    const danaReceivedScoreField = `danaReceivedScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaReceivedDownField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaReceivedScoreField, -1 * value)
    ]);
  }

  async setDanaReceivedUp(id: string, value: number) {
    const keyField = `danaReceivedUp:${id}`;
    await this.redis.hset(this.keyPrefix, keyField, value);
  }

  async setDanaReceivedDown(id: string, value: number) {
    const keyField = `danaReceivedDown:${id}`;
    await this.redis.hset(this.keyPrefix, keyField, value);
  }

  async setDanaReceivedScore(id: string, value: number) {
    const keyField = `danaReceivedScore:${id}`;
    await this.redis.hset(this.keyPrefix, keyField, value);
  }
}

