import { Page } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { CloudflareConfig } from '../../config/config.interface';
import { PrismaService } from '../prisma/prisma.service';
import { toImageUrl } from './page.utils';

export class PageCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:pages:item-data';
  private deliveryUrl = '';
  private cfAccountHash = '';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {
    const cloudflareConfig = this.config.get<CloudflareConfig>('cloudflare');
    this.deliveryUrl = cloudflareConfig?.cfImagesDeliveryUrl ?? '';
    this.cfAccountHash = cloudflareConfig?.cfAccountHash ?? '';
  }

  async getById(id: string): Promise<Page | null> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.page.findUnique({
        where: {
          id: id
        },
        include: {
          pageAccount: true,
          category: true,
          country: true,
          state: true,
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

      if (!dbValue) return null;

      const page: Page = new Page({
        ..._.omit(dbValue, 'country', 'state'),
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.avatar?.upload),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.cover?.upload),
        stateName: dbValue.state?.name || '',
        countryName: dbValue.country?.name || ''
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(page)));
      return page;
    }
    return new Page({ ...(decode(buffer) as Page) });
  }

  async getByIds(ids: string[]): Promise<Nullable<Page>[]> {
    if (ids.length === 0) return [];

    const itemsMap = new Map();

    try {
      const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
      const uncachedIds = [];
      for (let i = 0; i < ids.length; i++) {
        if (!values[i]) {
          uncachedIds.push(ids[i]);
        }
      }

      _.compact(values).map(value => {
        const page = decode(value) as Page;
        itemsMap.set(page.id, page);
      });

      const dbValues =
        uncachedIds.length > 0
          ? await this.prisma.page.findMany({
              where: {
                id: { in: uncachedIds }
              },
              include: {
                pageAccount: true,
                category: true,
                country: true,
                state: true,
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
          const page = new Page({
            ..._.omit(dbValue, 'country', 'state'),
            avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.avatar?.upload),
            cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbValue.cover?.upload),
            stateName: dbValue.state?.name || '',
            countryName: dbValue.country?.name || ''
          });
          itemsMap.set(dbValue.id, page);
          const buffer = encode(page);
          return [dbValue.id, Buffer.from(buffer)];
        })
      );

      if (dbValuesMap.size > 0) {
        await this.redis.hmset(this.keyPrefix, dbValuesMap);
      }
    } catch (err) {
      this.logger.error(err);
    }

    return ids.map(id => {
      const page = itemsMap.get(id);
      return page ? new Page({ ...page }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
