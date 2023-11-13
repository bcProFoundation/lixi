import { Account, ICommentableTo, Page, Post, PostDana, Repost, UploadDetail } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { FollowCacheService } from '../account/follow-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { DanaViewScoreService } from './dana-view-score.service';
import { PageCacheService } from './page-cache.service';
import { AccountCacheService } from '../account/account-cache.service';
import { PostDanaCacheService } from './post-dana-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class PostLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pageCacheService: PageCacheService,
    private readonly accountCacheService: AccountCacheService,
    private readonly danaViewScoreService: DanaViewScoreService,
    private readonly followCacheService: FollowCacheService,
    private readonly postDanaCacheService: PostDanaCacheService
  ) {}

  public readonly batchPostDanas = new DataLoader<string, PostDana>(async (ids: readonly string[]) => {
    const postIds = ids as unknown as string[];
    const danas = await this.postDanaCacheService.getPostDanas(postIds);
    const data = postIds.map((postId, index) => {
      return danas[index] ?? new PostDana({});
    });
    return Promise.resolve(data);
  });

  public async getPostsUploadsByBatch(postIds: readonly string[]): Promise<(UploadDetail | any)[]> {
    const ids = postIds as unknown as string[];
    const uploadsDb = await this.prisma.uploadDetail.findMany({
      where: {
        postId: { in: ids }
      },
      include: {
        upload: {
          select: {
            id: true,
            sha: true,
            bucket: true,
            width: true,
            height: true,
            cfImageId: true,
            cfImageFilename: true,
            originalFilename: true,
            extension: true,
            type: true,
            thumbnailHeight: true,
            thumbnailWidth: true
          }
        }
      }
    });
    const uploads = uploadsDb.map(item => {
      const upload: UploadDetail = {
        id: item.id,
        postId: item.postId,
        upload: {
          ...item.upload,
          sha: item.upload.sha || ''
        }
      };
      return upload;
    });

    return postIds.map(postId => {
      return uploads.filter(item => item.postId == postId) || null;
    });
  }

  public readonly batchUploads = new DataLoader<string, UploadDetail[]>(async (postIds: readonly string[]) => {
    return await this.getPostsUploadsByBatch(postIds);
  });

  public readonly batchPages = new DataLoader(async (ids: readonly string[]) => {
    const pageIds = ids as unknown as string[];
    const pages = await this.pageCacheService.getByIds(pageIds);
    const pagesMap = new Map(_.compact(pages).map(page => [page.id, page]));
    const data = ids.map((id, index) => {
      return pagesMap.get(id) ?? null;
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

  public readonly batchReposts = new DataLoader(async (postIds: readonly string[]) => {
    const ids = (postIds as unknown as string[]) ?? [];

    const repostsDb = await this.prisma.repost.findMany({
      where: {
        postId: {
          in: ids
        }
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
    }
  );

  public readonly batchCheckPostPinned = new DataLoader(async (pinableIds: readonly string[]) => {
    const listCheckPostPinned = pinableIds ?? [];
    return listCheckPostPinned.map(item => {
      return !!item;
    });
  });
}
