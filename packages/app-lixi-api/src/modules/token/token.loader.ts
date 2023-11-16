import { TokenDana } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { TokenDanaCacheService } from './token-dana-cache.service';

interface ICheckTokenIsFollowedInput {
  accountId: number;
  tokenId: string;
}

@Injectable({ scope: Scope.REQUEST })
export default class TokenLoader {
  constructor(
    private readonly tokenDanaCacheService: TokenDanaCacheService,
    private readonly followCacheService: FollowCacheService
  ) {}

  public readonly batchTokenDanas = new DataLoader<string, TokenDana>(async (ids: readonly string[]) => {
    const tokenIds = ids as unknown as string[];
    const danas = await this.tokenDanaCacheService.getTokenDanas(tokenIds);
    return tokenIds.map((tokenId, index) => {
      return danas[index] ?? new TokenDana({});
    });
  });

  public readonly batchFollowersCount = new DataLoader<string, number>(async (ids: readonly string[]) => {
    const tokenIds = ids as unknown as string[];
    const tokenFollowersCounts = await this.followCacheService.getTokenFollowersCounts(tokenIds);
    return tokenIds.map((tokenId, index) => {
      return tokenFollowersCounts[index] ?? 0;
    });
  });

  public readonly batchIsFollowed = new DataLoader(
    async (checkFollowArr: readonly ICheckTokenIsFollowedInput[]) => {
      const tokenIds = checkFollowArr.map(input => input.tokenId);
      const accountId = checkFollowArr && checkFollowArr.length > 0 ? checkFollowArr[0].accountId : 0;
      const checkTokenIsFollowed = await this.followCacheService.checkAccountFollowAllToken(accountId, tokenIds);
      return checkFollowArr.map((checkFollow, index) => {
        return checkTokenIsFollowed[index] ?? false;
      });
    },
    {
      cacheKeyFn: (input: ICheckTokenIsFollowedInput) => {
        return `${input.accountId}:${input.tokenId}`;
      }
    }
  );
}
