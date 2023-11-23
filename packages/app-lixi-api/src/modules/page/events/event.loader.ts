import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../../account/follow-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class EventLoader {
  constructor(private readonly followCacheService: FollowCacheService) {}

  public readonly batchCheckAccountFollowAllAccount = new DataLoader(
    async (items: readonly { followingAccountId?: number; accountId: number }[]) => {
      const listFollowingAccountId = items.map(item => item?.followingAccountId ?? 0);
      const listCheckAccountFollowAccount = await this.followCacheService.checkAccountFollowAllAccount(
        items[0].accountId,
        listFollowingAccountId
      );

      return listCheckAccountFollowAccount.map((item, index) => {
        return !!listCheckAccountFollowAccount[index];
      });
    },
    {
      cacheKeyFn: (item: { followingAccountId?: number; accountId: number }) => {
        return `${item.accountId}:${item.followingAccountId}`;
      }
    }
  );

  public readonly batchCheckAccountFollowAllPage = new DataLoader(
    async (items: readonly { pageId?: string; accountId: number }[]) => {
      const listPageId = items.map(item => item?.pageId ?? '');
      const listCheckAccountFollowPage = await this.followCacheService.checkAccountFollowAllPage(
        items[0].accountId,
        listPageId
      );

      return listCheckAccountFollowPage.map((item, index) => {
        return !!listCheckAccountFollowPage[index];
      });
    },
    {
      cacheKeyFn: (item: { pageId?: string; accountId: number }) => {
        return `${item.accountId}:${item.pageId}`;
      }
    }
  );

  public readonly batchCheckAccountFollowAllToken = new DataLoader(
    async (items: readonly { tokenId?: string; accountId: number }[]) => {
      const listTokenId = items.map(item => item?.tokenId ?? '');
      const listCheckAccountFollowToken = await this.followCacheService.checkAccountFollowAllToken(
        items[0].accountId,
        listTokenId
      );

      return listCheckAccountFollowToken.map((item, index) => {
        return !!listCheckAccountFollowToken[index];
      });
    },
    {
      cacheKeyFn: (item: { tokenId?: string; accountId: number }) => {
        return `${item.accountId}:${item.tokenId}`;
      }
    }
  );
}
