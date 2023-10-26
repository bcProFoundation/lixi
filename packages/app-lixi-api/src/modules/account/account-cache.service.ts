import { Account, AccountDana } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode } from '@msgpack/msgpack';
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
      const dbAccount = await this.prisma.account.findUnique({
        where: {
          id: _.toSafeInteger(id)
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
      });
      if (!dbAccount) return null;

      const account: Account = new Account({
        ...dbAccount,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.avatar?.upload),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.cover?.upload)
      });
      return account;
    }

    const account = decode(buffer) as Account;
    return account;
  }

  async getByAddress(address: string): Promise<Nullable<Account>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, address);

    if (!buffer) {
      // cache miss
      const dbAccount = await this.prisma.account.findFirst({
        where: {
          address: address
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
      });
      if (!dbAccount) return null;

      const account: Account = new Account({
        ...dbAccount,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.avatar?.upload),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.cover?.upload)
      });

      return account;
    }

    const account = decode(buffer) as Account;
    return account;
  }

  async getByMnemonicHash(mnemonicHash: string): Promise<Nullable<Account>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, mnemonicHash);
    if (!buffer) {
      // cache miss
      const dbAccount = await this.prisma.account.findFirst({
        where: {
          mnemonicHash: mnemonicHash
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
      });
      if (!dbAccount) return null;

      const account: Account = new Account({
        ...dbAccount,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.avatar?.upload),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbAccount.cover?.upload)
      });

      return account;
    }

    const account = decode(buffer) as Account;
    return account;
  }

  async removeByKey(key: string) {
    await this.redis.hdel(this.keyPrefix, key);
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
