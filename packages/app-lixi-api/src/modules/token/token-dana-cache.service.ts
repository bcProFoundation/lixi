import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { PrismaService } from '../prisma/prisma.service';
import { TokenDana } from '@bcpros/lixi-models';

@Injectable()
export class TokenDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:tokens:dana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getTokenDana(id: string) {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id.toString());

    if (!buffer) {
      // No value set yet
      const dbValue = await this.prisma.tokenDana.findUnique({
        where: {
          tokenId: id
        }
      });
      if (!dbValue) return null;

      const tokenDana: TokenDana = new TokenDana({
        ...dbValue
      });

      const buffer = Buffer.from(encode(tokenDana));
      await this.redis.hset(this.keyPrefix, id.toString(), buffer);

      return tokenDana;
    }
    return decode(buffer) as TokenDana;
  }

  async setTokenDana(id: string, tokenDana: TokenDana) {
    const buffer = Buffer.from(encode(tokenDana));
    await this.redis.hset(this.keyPrefix, id.toString(), buffer);
  }

  async getTokenDanas(ids: string[]) {
    const uncachedTokenIds = [];
    const keys = ids;
    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...keys);
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedTokenIds.push(ids[i]);
      }
    }

    const tokenDanasMap = new Map(
      _.compact(values).map(value => {
        const tokenDana = decode(value) as TokenDana;
        return [tokenDana.tokenId, tokenDana];
      })
    );

    const dbValues =
      uncachedTokenIds.length > 0
        ? await this.prisma.tokenDana.findMany({
          where: {
            tokenId: {
              in: uncachedTokenIds
            }
          }
        })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const tokenDana = new TokenDana({
          ...dbValue
        });
        tokenDanasMap.set(dbValue.tokenId, tokenDana);
        return [dbValue.tokenId, Buffer.from(encode(tokenDana))];
      })
    );

    // Set values to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    // Build and return the result
    return ids.map(id => {
      const tokenDana = tokenDanasMap.get(id);
      return tokenDana ? tokenDana : null;
    });
  }

  async removeByKeys(ids: string[]) {
    await this.redis.hdel(this.keyPrefix, ...ids);
  }
}
