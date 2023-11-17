import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDana } from '@bcpros/lixi-models';

@Injectable()
export class ProductDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:products:dana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getProductDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.productDana.findUnique({
        where: {
          productId: id
        }
      });
      if (!dbValue) return null;

      const dana: ProductDana = new ProductDana({
        ...dbValue
      });

      const buffer = Buffer.from(encode(dana));
      await this.redis.hset(this.keyPrefix, id.toString(), buffer);

      return dana;
    }
    return decode(buffer) as ProductDana;
  }

  async setProductDana(id: string, dana: ProductDana) {
    const buffer = Buffer.from(encode(dana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getProductDanas(ids: string[]) {
    const uncachedProductIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedProductIds.push(ids[i]);
      }
    }

    const productDanasMap = new Map(
      _.compact(values).map(value => {
        const productDana = decode(value) as ProductDana;
        return [productDana.productId, productDana];
      })
    );

    const dbValues =
      uncachedProductIds.length > 0
        ? await this.prisma.productDana.findMany({
            where: {
              productId: {
                in: uncachedProductIds
              }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const productDana = new ProductDana({
          ...dbValue
        });
        productDanasMap.set(dbValue.productId, productDana);
        return [dbValue.productId, Buffer.from(encode(productDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const productDana = productDanasMap.get(id);
      return productDana ? productDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
