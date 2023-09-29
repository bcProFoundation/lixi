import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostDanaCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:postdana';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) { }

  async getPageDana(id: string) {
    const keyFields = [`danaBurnUp:${id}`, `danaBurnDown:${id}`, `danaBurnScore:${id}`];
    const postDana = await this.redis.hmget(this.keyPrefix, ...keyFields);
    if (_.isNil(postDana[0]) || _.isNil(postDana[1]) || _.isNil(postDana[2])) {
      // No value set yet
      const dbValue = await this.prisma.postDana.findUnique({
        where: {
          postId: id
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
      danaBurnUp: postDana[0] ?? 0,
      danaBurnDown: postDana[1] ?? 0,
      danaBurnScore: postDana[2] ?? 0
    };
  }

  async incrDana(id: string, value: number) {
    const danaBurnUpField = `danaBurnUp:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnUpField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value),
    ]);
  }

  async decrDana(id: string, value: number) {
    const danaBurnDownField = `danaBurnDown:${id}`;
    const danaBurnScoreField = `danaBurnScore:${id}`;
    await Promise.all([
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnDownField, value),
      this.redis.hincrbyfloat(this.keyPrefix, danaBurnScoreField, value * (-1))
    ]);
  }
}
