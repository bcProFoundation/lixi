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

export class PageTimelineCacheService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {
  }

  async cachePageTimelineByTime(accountId: number) {
    const key = `timeline:pages:account:${accountId}`;
  }

  getTimelineIdsByUser(accountId: number) {

  }
}