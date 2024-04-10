import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { DanaViewScoreService } from '../dana-view-score.service';
import { FollowCacheService } from '../../account/follow-cache.service';
import { AccountCacheService } from '../../account/account-cache.service';
import { PollCacheService } from './poll-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class PollLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly accountCacheService: AccountCacheService,
    private readonly danaViewScoreService: DanaViewScoreService,
    private readonly followCacheService: FollowCacheService,
    private readonly pollCacheService: PollCacheService
  ) {}

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

  public readonly batchDefaultOptionsPoll = new DataLoader(
    async (items: readonly { accountId: number; postId: string }[]) => {
      const postIds = items.map(item => item.postId);
      const accountId = items[0].accountId;

      const resultMap = new Map();

      const polls = await this.pollCacheService.getByIds(postIds);

      polls &&
        polls.map(item => {
          item?.options.map(option => {
            const foundAccountInOption = option.pollAnswerOnAccount?.findIndex(item => item.accountId === accountId);
            if (foundAccountInOption !== -1) {
              resultMap.set(item.postId, [...(resultMap.get(item.postId) ?? []), option.id]);
            }
          });
        });

      return postIds.map(id => {
        return [...new Set(resultMap.get(id))]; //remove duplicate
      });
    }
  );

  public readonly batchTotalVote = new DataLoader(async (items: readonly string[]) => {
    const postIds = items as string[];

    const options = await this.prisma.pollOption.findMany({
      where: { pollId: { in: postIds } },
      include: { pollAnswerOnAccount: true }
    });

    const groupOption = _.groupBy(options, item => item.pollId);

    return postIds.map(id => {
      return (
        groupOption[id].reduce((accumulate, cur) => {
          return accumulate + cur.pollAnswerOnAccount.length;
        }, 0) ?? 0
      );
    });
  });

  public readonly batchDanaScoreOption = new DataLoader(async (items: readonly string[]) => {
    const optionIds = items as string[];

    const pollAnswers = await this.prisma.pollAnswerOnAccount.findMany({
      where: {
        pollOptionId: { in: optionIds }
      },
      select: { pollDanaScore: true, pollOptionId: true }
    });
    const groupPollAnswer = _.groupBy(pollAnswers, item => item.pollOptionId);

    return optionIds.map(id => {
      return groupPollAnswer[id]?.reduce((accumulate, cur) => accumulate + cur.pollDanaScore, 0) ?? 0;
    });
  });
}
