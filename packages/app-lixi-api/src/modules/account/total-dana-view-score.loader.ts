import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import Redis from 'ioredis';
import _ from 'lodash';
import { RedisDataLoader } from 'src/common/redis/redis-dataloader';
import { PrismaService } from '../prisma/prisma.service';
import { FollowOfType } from '@bcpros/lixi-models';
import { DanaViewScoreService } from '../page/dana-view-score.service';

@Injectable({ scope: Scope.REQUEST })
export default class TotalDanaViewScoreLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly danaViewScoreService: DanaViewScoreService
  ) { }

  public readonly batchTotalDanaViewScore = new RedisDataLoader(
    this.redis,
    'dataloader:DanaViewScoreLoader:batchTotalDanaViewScore',
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

          const listDanaViewScore = await this.danaViewScoreService.getByIds(allPostIdsPages);
          const mapDanaViewScore = new Map(allPostIdsPages.map((item, index) => [item, listDanaViewScore[index]]));

          const groupPostsInPage = _.groupBy(postsInPages, item => item.pageId);

          listPageIds.map(pageId => {
            const postsInPage = groupPostsInPage[pageId];
            const postIdsInPage = postsInPage.map(item => item.id);

            let totalDanaViewScoreInPage = 0;
            postIdsInPage.map(item => {
              totalDanaViewScoreInPage += parseFloat(mapDanaViewScore.get(item) ?? '0');
            });

            mapItem.set(pageId, totalDanaViewScoreInPage);
          });
        }

        if (listTokenIds.length > 0) {
          const postsInTokens = await this.prisma.post.findMany({
            where: { tokenId: { in: listTokenIds } },
            select: { id: true, tokenId: true }
          });

          const allPostIdsTokens = postsInTokens.map(item => item.id);

          const listDanaViewScore = await this.danaViewScoreService.getByIds(allPostIdsTokens);
          const mapDanaViewScore = new Map(allPostIdsTokens.map((item, index) => [item, listDanaViewScore[index]]));

          const groupPostsInToken = _.groupBy(postsInTokens, item => item.tokenId);

          listTokenIds.map(tokenId => {
            const postsInToken = groupPostsInToken[tokenId];
            const postIdsInToken = postsInToken.map(item => item.id);

            let totalDanaViewScoreInToken = 0;
            postIdsInToken.map(item => {
              totalDanaViewScoreInToken += parseFloat(mapDanaViewScore.get(item) ?? '0');
            });

            mapItem.set(tokenId, totalDanaViewScoreInToken);
          });
        }

        if (listAccountIds.length > 0) {
          const postsInAccounts = await this.prisma.post.findMany({
            where: { accountId: { in: listAccountIds } },
            select: { id: true, accountId: true }
          });

          const allPostIdsAccounts = postsInAccounts.map(item => item.id);

          const listDanaViewScore = await this.danaViewScoreService.getByIds(allPostIdsAccounts);
          const mapDanaViewScore = new Map(allPostIdsAccounts.map((item, index) => [item, listDanaViewScore[index]]));

          const groupPostsInAccount = _.groupBy(postsInAccounts, item => item.accountId);

          listAccountIds.map(accountId => {
            const postsInAccount = groupPostsInAccount[accountId];
            const postIdsInAccount = postsInAccount.map(item => item.id);

            let totalDanaViewScoreInAccount = 0;
            postIdsInAccount.map(item => {
              totalDanaViewScoreInAccount += parseFloat(mapDanaViewScore.get(item) ?? '0');
            });

            mapItem.set(accountId, totalDanaViewScoreInAccount);
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
