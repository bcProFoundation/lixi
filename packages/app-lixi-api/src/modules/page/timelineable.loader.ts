import { Account, ITimelineable, PostDana, Repost } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { RedisDataLoader } from '../../common/redis/redis-dataloader';
import { AccountCacheService } from '../account/account-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { DanaViewScoreService } from './dana-view-score.service';
import { PageCacheService } from './page-cache.service';
import { FollowCacheService } from '../account/follow-cache.service';
import { PostDanaCacheService } from './post-dana-cache.service';
import { BookmarkCacheService } from '../bookmark/bookmark-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class TimelineableLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly pageCacheService: PageCacheService,
    private readonly accountCacheService: AccountCacheService,
    private readonly postDanaCacheService: PostDanaCacheService,
    private readonly followCacheService: FollowCacheService,
    private readonly danaViewScoreService: DanaViewScoreService,
    private readonly bookmarkCacheService: BookmarkCacheService
  ) {}

  public readonly batchPages = new DataLoader(async (keys: readonly string[]) => {
    const pageIds = _.compact(keys);
    const pages = await this.pageCacheService.getByIds(pageIds);
    const pagesMap = new Map(_.compact(pages).map(page => [page.id, page]));
    const data = keys.map((key, index) => {
      return key ? pagesMap.get(key) ?? null : null;
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

  public readonly batchReposts = new RedisDataLoader(
    this.redis,
    'dataloader:PostLoader:batchReposts',
    new DataLoader(
      async (postIds: readonly string[]) => {
        const ids = (postIds as unknown as string[]) ?? [];

        const repostsDb = await this.prisma.repost.findMany({
          where: {
            postId: {
              in: ids
            }
          },
          include: {
            account: true
          }
        });
        const reposts = repostsDb.map(item => {
          return new Repost({
            ...item
          });
        });
        return postIds.map(postId => {
          return reposts.filter(item => item.postId == postId) || null;
        });
      },
      {
        cache: false
      }
    ),
    {
      expire: 600,
      buffer: false
    }
  );

  public readonly batchRepostCount = new RedisDataLoader(
    this.redis,
    'dataloader:PostLoader:batchRepostCount',
    new DataLoader(
      async (postIds: readonly string[]) => {
        const ids = (postIds as unknown as string[]) ?? [];
        const repostCount = await this.prisma.repost.groupBy({
          by: ['postId'],
          _count: {
            _all: true
          },
          where: {
            postId: {
              in: ids
            }
          }
        });
        const repostCountMap = new Map(
          repostCount.map(value => {
            return [value.postId, value._count._all];
          })
        );
        return postIds.map(postId => {
          return repostCountMap.get(postId) ?? 0;
        });
      },
      {
        cache: false
      }
    ),
    {
      expire: 600,
      buffer: false,
      serialize: value => {
        return value.toString();
      },
      deserialize: value => {
        return _.toSafeInteger(value);
      }
    }
  );

  public readonly batchDanas = new DataLoader<string, PostDana>(async (ids: readonly string[]) => {
    const postIds = ids as unknown as string[];
    const danas = await this.postDanaCacheService.getPostDanas(postIds);
    const data = postIds.map((postId, index) => {
      return danas[index] ?? new PostDana({});
    });
    return Promise.resolve(data);
  });

  public readonly batchDanaViewScores = new DataLoader(async (postIds: readonly string[]) => {
    const ids = (postIds as unknown as string[]) ?? [];
    const scores = await this.danaViewScoreService.getByIds(ids);
    return postIds.map((postId: string, index: number) => {
      return scores[index] || 0;
    });
  });

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

  public readonly batchCheckAllBookmark = new DataLoader(
    async (items: readonly { postTimelineId: string; accountId: number }[]) => {
      const listPostTimelineIds = items.map(item => item.postTimelineId);
      const accountId = items[0].accountId;
      const listCheckBookmark = await this.bookmarkCacheService.checkAccountBookmarkAllPost(
        listPostTimelineIds,
        accountId
      );
      return listCheckBookmark.map(item => {
        return !!item;
      });
    }
  );
}
