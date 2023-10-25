import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { decode, encode } from '@msgpack/msgpack';
import { AccountDana } from '@bcpros/lixi-models';

@Injectable()
export class AccountDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:accountdana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getAccountDana(id: number) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.accountDana.findUnique({
        where: {
          accountId: id
        }
      });
      if (!dbValue) return null;

      const accountDana: AccountDana = new AccountDana({
        ...dbValue
      });

      const buffer = Buffer.from(encode(accountDana));
      await this.redis.hset(this.keyPrefix, id.toString(), buffer);

      return accountDana;
    }
    return decode(buffer) as AccountDana;
  }

  async setAccountDana(id: number, accountDana: AccountDana) {
    const buffer = Buffer.from(encode(accountDana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getAccountDanas(ids: number[]) {
    const uncachedAccountIds = [];
    const keys = ids.map(id => id.toString());
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedAccountIds.push(ids[i]);
      }
    }

    const accountDanasMap = new Map(
      _.compact(values).map(value => {
        const accountDana = decode(value) as AccountDana;
        return [accountDana.accountId.toString(), accountDana];
      })
    );

    const dbValues =
      uncachedAccountIds.length > 0
        ? await this.prisma.accountDana.findMany({
          where: {
            accountId: {
              in: uncachedAccountIds
            }
          }
        })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const accountDana = new AccountDana({
          ...dbValue
        });
        accountDanasMap.set(dbValue.accountId.toString(), accountDana);
        const buffer = Buffer.from(encode(accountDana));
        return [dbValue.accountId.toString(), buffer];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const accountDana = accountDanasMap.get(id.toString());
      return accountDana ? accountDana : null;
    });
  }
}
