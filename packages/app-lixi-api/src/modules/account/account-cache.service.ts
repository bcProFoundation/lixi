import { Account, AccountDana } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { CloudflareConfig } from '../../config/config.interface';
import { toImageUrl } from '../page/page.utils';
import { PrismaService } from '../prisma/prisma.service';
import { AccountDanaCacheService } from './account-dana-cache.service';

@Injectable()
export class AccountCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:accounts:item-data';
  private deliveryUrl = '';
  private cfAccountHash = '';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly accountDanaCacheService: AccountDanaCacheService,
    @InjectRedis() private readonly redis: Redis
  ) {
    const cloudflareConfig = this.config.get<CloudflareConfig>('cloudflare');
    this.deliveryUrl = cloudflareConfig?.cfImagesDeliveryUrl ?? '';
    this.cfAccountHash = cloudflareConfig?.cfAccountHash ?? '';
  }

  async getById(id: number) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.account.findUnique({
        where: {
          id: _.toSafeInteger(id)
        },
        include: {
          accountAvatarImageUploadable: {
            include: {
              uploads: true
            }
          },
          accountCoverImageUploadable: {
            include: {
              uploads: true
            }
          }
        }
      });
      if (!dbValue) return null;

      const account: Account = new Account({
        ...dbValue,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountAvatarImageUploadable?.uploads[0]),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountCoverImageUploadable?.uploads[0]),
        hash160: dbValue.hash160.toString('hex')
      });
      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(account)));
      return account;
    }

    const account = new Account({ ...(decode(buffer) as Account) });
    return account;
  }

  async getByIds(ids: number[]): Promise<Nullable<Account>[]> {
    if (ids.length === 0) return [];

    const accountsMap = new Map();

    try {
      const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids.map(id => id.toString()));
      const uncachedIds: number[] = [];
      for (let i = 0; i < ids.length; i++) {
        if (!values[i]) {
          uncachedIds.push(_.toSafeInteger(ids[i]));
        }
      }
      _.compact(values).map(value => {
        const account = decode(value) as Account;
        accountsMap.set(account.id.toString(), account);
      });

      const dbValues =
        uncachedIds.length > 0
          ? await this.prisma.account.findMany({
              where: {
                id: { in: uncachedIds }
              },
              include: {
                avatar: {
                  include: {
                    upload: true
                  }
                },
                cover: {
                  include: {
                    upload: true
                  }
                }
              }
            })
          : [];

      const dbValuesMap = new Map(
        dbValues.map(dbValue => {
          const account = new Account({
            ...dbValue,
            avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.avatar?.upload),
            cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.cover?.upload),
            hash160: dbValue.hash160.toString('hex')
          });
          accountsMap.set(dbValue.id.toString(), account);
          const buffer = encode(account);
          return [dbValue.id.toString(), Buffer.from(buffer)];
        })
      );

      if (dbValuesMap.size > 0) {
        this.redis.hmset(this.keyPrefix, dbValuesMap);
      }
    } catch (err) {
      this.logger.error(err);
    }

    return ids.map(id => {
      const account = accountsMap.get(id.toString());
      return account ? new Account({ ...account }) : null;
    });
  }

  async getByAddress(address: string): Promise<Nullable<Account>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, address);

    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.account.findFirst({
        where: {
          address: address
        },
        include: {
          accountAvatarImageUploadable: {
            include: {
              uploads: true
            }
          },
          accountCoverImageUploadable: {
            include: {
              uploads: true
            }
          }
        }
      });
      if (!dbValue) return null;

      const account: Account = new Account({
        ...dbValue,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountAvatarImageUploadable?.uploads[0]),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountCoverImageUploadable?.uploads[0]),
        hash160: dbValue.hash160.toString('hex')
      });

      await this.redis.hset(this.keyPrefix, address, Buffer.from(encode(account)));
      return account;
    }

    const account = new Account({ ...(decode(buffer) as Account) });
    return account;
  }

  async getByAddresses(addresses: string[]): Promise<Nullable<Account>[]> {
    if (addresses.length === 0) return [];

    const accountsMap = new Map();

    try {
      const values = await this.redis.hmgetBuffer(this.keyPrefix, ...addresses);
      const uncachedAddresses: string[] = [];
      for (let i = 0; i < addresses.length; i++) {
        if (!values[i]) {
          uncachedAddresses.push(addresses[i]);
        }
      }
      _.compact(values).map(value => {
        const account = decode(value) as Account;
        accountsMap.set(account.address, account);
      });

      const dbValues =
        uncachedAddresses.length > 0
          ? await this.prisma.account.findMany({
              where: {
                address: { in: uncachedAddresses }
              },
              include: {
                avatar: {
                  include: {
                    upload: true
                  }
                },
                cover: {
                  include: {
                    upload: true
                  }
                }
              }
            })
          : [];

      const dbValuesMap = new Map(
        dbValues.map(dbValue => {
          const account = new Account({
            ...dbValue,
            avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.avatar?.upload),
            cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.cover?.upload),
            hash160: dbValue.hash160.toString('hex')
          });
          accountsMap.set(dbValue.address, account);
          const buffer = encode(account);
          return [dbValue.address, Buffer.from(buffer)];
        })
      );

      if (dbValuesMap.size > 0) {
        this.redis.hmset(this.keyPrefix, dbValuesMap);
      }
    } catch (err) {
      this.logger.error(err);
    }

    return addresses.map(address => {
      const account = accountsMap.get(address);
      return account ? new Account({ ...account }) : null;
    });
  }

  async getByMnemonicHash(mnemonicHash: string): Promise<Nullable<Account>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, mnemonicHash);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.account.findFirst({
        where: {
          mnemonicHash: mnemonicHash
        },
        include: {
          accountAvatarImageUploadable: {
            include: {
              uploads: true
            }
          },
          accountCoverImageUploadable: {
            include: {
              uploads: true
            }
          }
        }
      });
      if (!dbValue) return null;

      const account: Account = new Account({
        ...dbValue,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountAvatarImageUploadable?.uploads[0]),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.accountCoverImageUploadable?.uploads[0]),
        hash160: dbValue.hash160.toString('hex')
      });

      await this.redis.hset(this.keyPrefix, mnemonicHash, Buffer.from(encode(account)));

      return account;
    }

    const account = new Account({ ...(decode(buffer) as Account) });
    return account;
  }

  async removeByKey(key: string) {
    await this.redis.hdel(this.keyPrefix, key);
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
