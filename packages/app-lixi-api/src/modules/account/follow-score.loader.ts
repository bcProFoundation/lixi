import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import Redis from 'ioredis';
import _ from 'lodash';
import { RedisDataLoader } from 'src/common/redis/redis-dataloader';
import { PrismaService } from '../prisma/prisma.service';
import { FollowOfType } from '@bcpros/lixi-models';
import { DanaViewScoreService } from '../page/dana-view-score.service';

@Injectable({ scope: Scope.REQUEST })
export default class TotalPostViewsLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly danaViewScoreService: DanaViewScoreService
  ) {}

  public readonly batchTotalPostViews = new RedisDataLoader(
    this.redis,
    'dataloader:PostViewsLoader:batchTotalPostViews',
    new DataLoader(
      async (followOfType: readonly FollowOfType[]) => {
        const listFollowOfType = _.compact(followOfType);
        let mapItem = new Map();
        const listPageIds = _.compact(listFollowOfType.map(item => item.pageId));
        const listTokenIds = _.compact(listFollowOfType.map(item => item.tokenId));
        const listAccountIds = _.compact(listFollowOfType.map(item => item.accountId));

        if (listPageIds.length > 0) {
          const postsInPages = await this.prisma.post.findMany({
            where: { pageId: { in: listPageIds } },
            select: { id: true, pageId: true }
          });

          const allPostIdsPages = postsInPages.map(item => item.id);

          const listPostView = await this.danaViewScoreService.getByIds(allPostIdsPages);
          const mapPostView = new Map(allPostIdsPages.map((item, index) => [item, listPostView[index]]));

          const groupPostsInPage = _.groupBy(postsInPages, item => item.pageId);

          listPageIds.map(pageId => {
            const postsInPage = groupPostsInPage[pageId];
            const postIdsInPage = postsInPage.map(item => item.id);

            let totalPostViewsInPage = 0;
            postIdsInPage.map(item => {
              totalPostViewsInPage += parseFloat(mapPostView.get(item) ?? '0');
            });

            mapItem.set(pageId, totalPostViewsInPage);
          });
        }

        if (listTokenIds.length > 0) {
          const postsInTokens = await this.prisma.post.findMany({
            where: { tokenId: { in: listTokenIds } },
            select: { id: true, tokenId: true }
          });

          const allPostIdsTokens = postsInTokens.map(item => item.id);

          const listPostView = await this.danaViewScoreService.getByIds(allPostIdsTokens);
          const mapPostView = new Map(allPostIdsTokens.map((item, index) => [item, listPostView[index]]));

          const groupPostsInToken = _.groupBy(postsInTokens, item => item.tokenId);

          listTokenIds.map(tokenId => {
            const postsInToken = groupPostsInToken[tokenId];
            const postIdsInToken = postsInToken.map(item => item.id);

            let totalPostViewsInToken = 0;
            postIdsInToken.map(item => {
              totalPostViewsInToken += parseFloat(mapPostView.get(item) ?? '0');
            });

            mapItem.set(tokenId, totalPostViewsInToken);
          });
        }

        if (listAccountIds.length > 0) {
          const postsInAccounts = await this.prisma.post.findMany({
            where: { accountId: { in: listAccountIds } },
            select: { id: true, accountId: true }
          });

          const allPostIdsAccounts = postsInAccounts.map(item => item.id);

          const listPostView = await this.danaViewScoreService.getByIds(allPostIdsAccounts);
          const mapPostView = new Map(allPostIdsAccounts.map((item, index) => [item, listPostView[index]]));

          const groupPostsInAccount = _.groupBy(postsInAccounts, item => item.accountId);

          listAccountIds.map(accountId => {
            const postsInAccount = groupPostsInAccount[accountId];
            const postIdsInAccount = postsInAccount.map(item => item.id);

            let totalPostViewsInAccount = 0;
            postIdsInAccount.map(item => {
              totalPostViewsInAccount += parseFloat(mapPostView.get(item) ?? '0');
            });

            mapItem.set(accountId, totalPostViewsInAccount);
          });
        }

        return followOfType.map(item => {
          const { accountId, pageId, tokenId } = item;
          if (pageId) return mapItem.get(pageId) ?? 0;
          if (tokenId) return mapItem.get(tokenId) ?? 0;
          if (accountId) return mapItem.get(accountId) ?? 0;
        });
      },
      { cache: false }
    ),
    {
      expire: 600,
      buffer: false,
      serialize: value => (value ? value.toString() : '0'),
      deserialize: value => _.toSafeInteger(value)
    }
  );
}
