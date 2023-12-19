import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import Redis from 'ioredis';
import _ from 'lodash';
import { RedisDataLoader } from 'src/common/redis/redis-dataloader';
import { PrismaService } from '../prisma/prisma.service';
import { FollowOfType } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';

@Injectable({ scope: Scope.REQUEST })
export default class FollowScoreLoader {
  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  public readonly batchTotalDanaFollowers = new RedisDataLoader(
    this.redis,
    'dataloader:FollowScoreLoader:batchTotalDanaFollowers',
    new DataLoader(
      async (followOfType: readonly FollowOfType[]) => {
        const listFollowOfType = _.compact(followOfType);
        let mapItem = new Map();
        const listPageIds = listFollowOfType.filter(item => !_.isNil(item.pageId)).map(item => item.pageId);
        const listTokenIds = listFollowOfType.filter(item => !_.isNil(item.tokenId)).map(item => item.tokenId);
        const listAccountIds = listFollowOfType.filter(item => !_.isNil(item.accountId)).map(item => item.accountId);

        if (listPageIds.length > 0) {
          const listFollowScorePage: any[] = await this.prisma.$queryRaw`
          SELECT
            follow_page.page_id, SUM(account_dana.dana_given) + SUM(account_dana.dana_received) AS FollowScore
          FROM account_dana
          JOIN account
            ON account_dana.account_id = account.id 
          JOIN follow_page
            ON account.id = follow_page.account_id
          WHERE follow_page.page_id IN (${Prisma.join(listPageIds)})
          GROUP BY follow_page.page_id 
        `;
          listFollowScorePage.map(item => {
            mapItem.set(item.page_id, item.followscore);
          });
        }

        if (listTokenIds.length > 0) {
          const listFollowScoreToken: any[] = await this.prisma.$queryRaw`
          SELECT
            follow_page.token_id, SUM(account_dana.dana_given) + SUM(account_dana.dana_received) AS FollowScore
          FROM account_dana
          JOIN account
            ON account_dana.account_id = account.id
          JOIN follow_page
            ON account.id = follow_page.account_id
          WHERE follow_page.token_id IN (${Prisma.join(listTokenIds)})
          GROUP BY follow_page.token_id 
        `;
          listFollowScoreToken.map(item => {
            mapItem.set(item.token_id, item.followscore);
          });
        }

        if (listAccountIds.length > 0) {
          const listFollowScoreAccount: any[] = await this.prisma.$queryRaw`
          SELECT
            follow_account.following_account_id, SUM(account_dana.dana_given) + SUM(account_dana.dana_received) AS FollowScore
          FROM account_dana
          JOIN account
            ON account_dana.account_id = account.id
          JOIN follow_account
            ON account.id = follow_account.follower_account_id
          WHERE follow_account.following_account_id IN (${Prisma.join(listAccountIds)})
          GROUP BY follow_account.following_account_id
        `;
          listFollowScoreAccount.map(item => {
            mapItem.set(item.following_account_id, item.followscore);
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
