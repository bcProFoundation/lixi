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

  async getPageById(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbPage = await this.prisma.page.findUnique({
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

      if (!dbPage) return null;

      const page: Page = new Page({
        ...dbPage,
        avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbPage.avatar?.upload),
        cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbPage.cover?.upload)
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(page)));
      return page;
    }
    return decode(buffer);
  }

  async getPagesByIds(ids: string[]) {
    const buffers = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedPageIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!buffers[i]) {
        uncachedPageIds.push(ids[i]);
      }
    }

    let uncachedPagesMap = new Map();
    if (!_.isEmpty(uncachedPageIds)) {
      const uncachedPages = await this.prisma.page.findMany({
        where: {
          id: { in: uncachedPageIds }
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
      uncachedPagesMap = new Map(
        uncachedPages.map(item => {
          return [item.id, item];
        })
      );
    }

    const pages: Page[] = [];
    const pipeline = this.redis.pipeline();
    for (let i = 0; i < ids.length; i++) {
      if (!buffers[i]) {
        const dbPage = uncachedPagesMap.get(ids[i]);
        if (dbPage) {
          const page: Page = new Page({
            ...dbPage,
            avatar: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbPage.avatar?.upload),
            cover: toImageUrl(this.deliveryUrl, this.cfAccountHash, dbPage.cover?.upload)
          });
          const buffer = Buffer.from(encode(page));
          buffers[i] = buffer;
          pages.push(page);
          pipeline.hset(this.keyPrefix, page.id, buffer);
        }
      } else {
        const page = decode(buffers[i]) as Page;
        pages.push(page);
      }
    }

    return pages;
  }
}