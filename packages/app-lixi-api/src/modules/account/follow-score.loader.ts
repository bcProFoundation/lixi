import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import Redis from 'ioredis';
import _ from 'lodash';
import { RedisDataLoader } from 'src/common/redis/redis-dataloader';
import { PrismaService } from '../prisma/prisma.service';
import { FollowOfType } from '@bcpros/lixi-models';

@Injectable({ scope: Scope.REQUEST })
export default class FollowScoreLoader {
  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  public readonly batchTotalDanaFollowers = new RedisDataLoader(
    this.redis,
    'dataloader:FollowScoreLoader:batchTotalDanaFollowers',
    new DataLoader(
      async (followOfType: readonly FollowOfType[]) => {
        const listFollowOfType = _.compact(followOfType);

        return followOfType.map(async followType => {
          const { pageId, tokenId, accountId } = followType;

          if (pageId) {
            const accountIdsFollowPage = await this.prisma.followPage.findMany({
              where: { pageId },
              select: { accountId: true }
            });
            const listAccountIdsFollowPage = accountIdsFollowPage.map(item => item.accountId);

            const followScore = await this.prisma.accountDana.aggregate({
              where: {
                accountId: { in: listAccountIdsFollowPage }
              },
              _sum: {
                danaGiven: true,
                danaReceived: true
              }
            });

            const danaReceived = followScore._sum.danaReceived ?? 0;
            const danaGiven = followScore._sum.danaGiven ?? 0;
            const totalFollowScore = danaReceived + danaGiven;

            return totalFollowScore;
          } else if (accountId) {
            const accountIdsFollowAccount = await this.prisma.followAccount.findMany({
              where: { followingAccountId: accountId },
              select: { followerAccountId: true }
            });
            const listAccountIdsFollowAccount = accountIdsFollowAccount.map(item => item.followerAccountId);

            const followScore = await this.prisma.accountDana.aggregate({
              where: {
                accountId: { in: listAccountIdsFollowAccount }
              },
              _sum: {
                danaGiven: true,
                danaReceived: true
              }
            });

            const danaReceived = followScore._sum.danaReceived ?? 0;
            const danaGiven = followScore._sum.danaGiven ?? 0;
            const totalFollowScore = danaReceived + danaGiven;

            return totalFollowScore;
          } else if (tokenId) {
            const accountIdsFollowToken = await this.prisma.followPage.findMany({
              where: { tokenId },
              select: { accountId: true }
            });
            const listAccountIdsFollowToken = accountIdsFollowToken.map(item => item.accountId);

            const followScore = await this.prisma.accountDana.aggregate({
              where: {
                accountId: { in: listAccountIdsFollowToken }
              },
              _sum: {
                danaGiven: true,
                danaReceived: true
              }
            });

            const danaReceived = followScore._sum.danaReceived ?? 0;
            const danaGiven = followScore._sum.danaGiven ?? 0;
            const totalFollowScore = danaReceived + danaGiven;

            return totalFollowScore;
          }
        });
      },
      { cache: false }
    ),
    {
      expire: 600,
      buffer: false,
      serialize: value => (value ? value.toString() : '0'),
      deserialize: async value => _.toSafeInteger(value)
    }
  );
}
