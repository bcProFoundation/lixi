import { AccountType, COIN, OfferStatus, OfferType, Post, Role } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { OfferPaymentMethod } from '@bcpros/lixi-prisma';

export class PostCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:posts:item-data';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<Post>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.post.findUnique({
        where: {
          id: id
        },
        include: {
          account: true,
          translations: true,
          offer: {
            include: {
              paymentMethods: true,
              escrowOrders: true,
              country: true,
              location: true,
              state: true
            }
          }
        }
      });
      if (!dbValue) return null;

      const post: Post = new Post({
        ...dbValue,
        account: {
          ...dbValue.account,
          role: dbValue?.account.role as Role,
          hash160: dbValue?.account.hash160.toString('hex'),
          accountType: dbValue?.account.accountType as AccountType
        },
        offer: {
          ...dbValue.offer,
          coin: dbValue?.offer?.coin as COIN,
          postId: dbValue?.id,
          publicKey: dbValue?.offer?.publicKey as string,
          message: dbValue?.offer?.message as string,
          price: dbValue?.offer?.price as string,
          marginPercentage: dbValue?.offer?.marginPercentage as number,
          orderLimitMin: dbValue?.offer?.orderLimitMin as number,
          orderLimitMax: dbValue?.offer?.orderLimitMax as number,
          type: dbValue?.offer?.type as OfferType,
          //@ts-ignore
          paymentMethods: [...dbValue?.offer?.paymentMethods!]
        }
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(post)));

      return post;
    }

    const post = decode(buffer) as Post;
    return new Post({ ...post });
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i] && ids[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Post;
        return [item.id, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.post.findMany({
            where: {
              id: { in: uncachedIds }
            },
            include: {
              account: true,
              translations: true
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new Post({
          ...dbValue,
          account: {
            ...dbValue.account,
            role: dbValue?.account.role as Role,
            hash160: dbValue?.account.hash160.toString('hex'),
            accountType: dbValue?.account.accountType as AccountType
          }
        });
        itemsMap.set(dbValue.id, item);
        return [dbValue.id, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? new Post({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
