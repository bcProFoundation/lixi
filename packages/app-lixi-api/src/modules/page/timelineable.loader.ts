import { Account, ITimelineable, PostDana, Repost, UploadDetail } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { AccountCacheService } from '../account/account-cache.service';
import { FollowCacheService } from '../account/follow-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { DanaViewScoreService } from './dana-view-score.service';
import { PageCacheService } from './page-cache.service';
import { PostDanaCacheService } from './post-dana-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class TimelineableLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly pageCacheService: PageCacheService,
    private readonly accountCacheService: AccountCacheService
  ) {}

  public readonly batchPages = new DataLoader(async (keys: readonly ITimelineable[]) => {
    const pageIds = _.compact(keys.map(key => key.pageId));
    const pages = await this.pageCacheService.getByIds(pageIds);
    const pagesMap = new Map(_.compact(pages).map(page => [page.id, page]));
    const data = keys.map((key, index) => {
      return key.pageId ? pagesMap.get(key?.pageId!) ?? null : null;
    });
    return Promise.resolve(data);
  });

  public readonly batchAccounts = new DataLoader(async (accountIds: readonly number[]) => {
    const ids = (accountIds as unknown as number[]) ?? [];
    const accounts = await this.accountCacheService.getByIds(ids);
    const data = accountIds.map((accountId, index) => {
      return accounts[index] ?? new Account({ id: accountId });
    });
    return Promise.resolve(data);
  });
}
