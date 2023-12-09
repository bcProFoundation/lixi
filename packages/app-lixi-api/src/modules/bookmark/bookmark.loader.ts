import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { BookmarkCacheService } from './bookmark-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class BookmarkLoader {
  constructor(private readonly bookmarkCacheService: BookmarkCacheService) {}

  public readonly batchCheckAllBookmark = new DataLoader(
    async (items: readonly { timelineIds: string; accountId: number }[]) => {
      const listTimelineIds = items.map(item => item.timelineIds);
      const accountId = items[0].accountId;
      const listCheckBookmark = await this.bookmarkCacheService.checkAccountBookmarkAllPost(listTimelineIds, accountId);
      return listCheckBookmark.map(item => {
        return !!item;
      });
    },
    {
      cacheKeyFn: (item: { timelineIds: string; accountId: number }) => `${item.accountId}:${item.timelineIds}`
    }
  );
}
