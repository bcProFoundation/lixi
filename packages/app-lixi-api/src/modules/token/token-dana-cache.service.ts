import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:tokendana';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getPageDana(id: string) {
    const keyFields = [`danaBurnUp:${id}`, `danaBurnDown:${id}`, `danaBurnScore:${id}`];
    const tokenDana = await this.redis.hmget(this.keyPrefix, ...keyFields);
    if (_.isNil(tokenDana[0]) || _.isNil(tokenDana[1]) || _.isNil(tokenDana[2])) {
      // No value set yet
      const dbValue = await this.prisma.tokenDana.findUnique({
        where: {
          tokenId: id
        }
      });
      const fieldValues = new Map([
        [`danaBurnUp:${id}`, dbValue?.danaBurnUp ?? 0],
        [`danaBurnDown:${id}`, dbValue?.danaBurnDown ?? 0],
        [`danaBurnScore:${id}`, dbValue?.danaBurnScore ?? 0]
      ]);
      await this.redis.hmset(this.keyPrefix, fieldValues);

      return {
        danaBurnUp: dbValue?.danaBurnUp ?? 0,
        danaBurnDown: dbValue?.danaBurnDown ?? 0,
        danaBurnScore: dbValue?.danaBurnScore ?? 0
      };
    }
    return {
      danaBurnUp: tokenDana[0] ?? 0,
      danaBurnDown: tokenDana[1] ?? 0,
      danaBurnScore: tokenDana[2] ?? 0
    };
  }

  async incrDana(id: string, value: number) {
    const danaBurnUpField = `danaBurnUp:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnUpField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value)
    ]);
  }

  async decrDana(id: string, value: number) {
    const danaBurnDownField = `danaBurnDown:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnDownField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value * -1)
    ]);
  }
}
