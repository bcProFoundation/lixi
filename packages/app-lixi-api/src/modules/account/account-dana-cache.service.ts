import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:accountdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getAccountDana(id: number) {
    const keyFields = [
      `danaGiven:${id}`,
      `danaReceived:${id}`,
      `danaBurnUp:${id}`,
      `danaBurnDown:${id}`,
      `danaBurnScore:${id}`
    ];
    const accountDana = await this.redis.hmget(this.keyPrefix, ...keyFields);
    if (
      _.isNil(accountDana[0]) ||
      _.isNil(accountDana[1]) ||
      _.isNil(accountDana[2]) ||
      _.isNil(accountDana[3]) ||
      _.isNil(accountDana[4])
    ) {
      // No value set yet
      const dbValue = await this.prisma.accountDana.findUnique({
        where: {
          accountId: id
        }
      });
      const fieldValues = new Map([
        [`danaGiven:${id}`, dbValue?.danaGiven ?? 0],
        [`danaReceived:${id}`, dbValue?.danaReceived ?? 0],
        [`danaBurnUp:${id}`, dbValue?.danaBurnUp ?? 0],
        [`danaBurnDown:${id}`, dbValue?.danaBurnDown ?? 0],
        [`danaBurnScore:${id}`, dbValue?.danaBurnScore ?? 0]
      ]);
      await this.redis.hmset(this.keyPrefix, fieldValues);

      return {
        danaGiven: dbValue?.danaGiven ?? 0,
        danaReceived: dbValue?.danaReceived ?? 0
      };
    }
    return {
      danaGiven: accountDana[0] ?? 0,
      danaReceived: accountDana[1] ?? 0
    };
  }

  async incrDana(id: number, value: number) {
    const danaBurnUpField = `danaBurnUp:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnUpField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value)
    ]);
  }

  async decrDana(id: number, value: number) {
    const danaBurnDownField = `danaBurnDown:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnDownField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value * -1)
    ]);
  }

  async incrDanaGivenBy(id: number, value: number) {
    const keyField = `danaGiven:${id}`;
    await this.redis.hincrbyfloat(this.keyPrefix, keyField, value);
  }

  async incrDanaReceivedBy(id: number, value: number) {
    const keyField = `danaReceived:${id}`;
    await this.redis.hincrbyfloat(this.keyPrefix, keyField, value);
  }

  async setDanaGiven(id: number, value: number) {
    const keyField = `danaGiven:${id}`;
    await this.redis.hset(this.keyPrefix, keyField, value);
  }

  async setDanaReceived(id: number, value: number) {
    const keyField = `danaReceived:${id}`;
    await this.redis.hset(this.keyPrefix, keyField, value);
  }
}
