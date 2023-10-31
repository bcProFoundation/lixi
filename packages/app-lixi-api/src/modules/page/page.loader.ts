import { PageDana } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { PageDanaCacheService } from './page-dana-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class PageLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pageDanaCacheService: PageDanaCacheService,
    private readonly followCacheService: FollowCacheService
  ) {}

  public readonly batchPageDanas = new DataLoader<string, PageDana>(async (ids: readonly string[]) => {
    const pageIds = ids as unknown as string[];
    const pageDanas = await this.pageDanaCacheService.getPageDanas(pageIds);
    const data = pageIds.map((pageId, index) => {
      return (
        pageDanas[index] ??
        new PageDana({
          danaBurnUp: 0,
          danaBurnDown: 0,
          danaBurnScore: 0,
          danaReceivedUp: 0,
          danaReceivedDown: 0,
          danaReceivedScore: 0,
          version: 0,
          pageId: pageId
        })
      );
    });
    return Promise.resolve(data);
  });

  public readonly batchFollowersCount = new DataLoader<string, number>(async (ids: readonly string[]) => {
    const pageIds = ids as unknown as string[];
    const pageFollowersCounts = await this.followCacheService.getPageFollowersCounts(pageIds);
    const data = pageIds.map((pageId, index) => {
      return pageFollowersCounts[index] ?? 0;
    });
    return Promise.resolve(data);
  });
}
