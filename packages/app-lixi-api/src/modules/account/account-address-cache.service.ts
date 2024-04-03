import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { decode, encode } from '@msgpack/msgpack';
import { AccountAddress } from '@bcpros/lixi-models';

@Injectable()
export class AccountAddressCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:accounts:address';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getAccountAddress(id: number) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.accountAddress.findUnique({
        where: {
          accountId: id
        }
      });
      if (!dbValue) return null;

      const accountAddress: AccountAddress = new AccountAddress({
        ...dbValue,
        xpiAddressHash160: dbValue.xpiAddressHash160.toString('hex')
      });

      const buffer = Buffer.from(encode(accountAddress));
      await this.redis.hset(this.keyPrefix, id.toString(), buffer);

      return accountAddress;
    }
    return decode(buffer) as AccountAddress;
  }

  async setAccountAddress(id: number, accountAddress: AccountAddress) {
    const buffer = Buffer.from(encode(accountAddress));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getAccountAddresses(ids: number[]) {
    const uncachedAccountIds = [];
    const keys = ids.map(id => id.toString());
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedAccountIds.push(ids[i]);
      }
    }

    const accountAddresssesMap = new Map(
      _.compact(values).map(value => {
        const accountAddress = decode(value) as AccountAddress;
        return [accountAddress.accountId.toString(), accountAddress];
      })
    );

    const dbValues =
      uncachedAccountIds.length > 0
        ? await this.prisma.accountAddress.findMany({
            where: {
              accountId: {
                in: uncachedAccountIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const accountAddress = new AccountAddress({
          ...dbValue,
          xpiAddressHash160: dbValue.xpiAddressHash160.toString('hex')
        });
        accountAddresssesMap.set(dbValue.accountId.toString(), accountAddress);
        const buffer = Buffer.from(encode(accountAddress));
        return [dbValue.accountId.toString(), buffer];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const accountAddress = accountAddresssesMap.get(id.toString());
      return accountAddress ? accountAddress : null;
    });
  }

  async removeByKeys(ids: number[]) {
    await this.redis.hdel(this.keyPrefix, ...ids.map(item => _.toString(item)));
  }
}
