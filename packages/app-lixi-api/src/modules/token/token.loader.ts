import { TokenDana } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { TokenDanaCacheService } from './token-dana-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class TokenLoader {
  constructor(
    private readonly tokenDanaCacheService: TokenDanaCacheService,
    private readonly followCacheService: FollowCacheService
  ) {}

  public readonly batchTokenDanas = new DataLoader<string, TokenDana>(async (ids: readonly string[]) => {
    const tokenIds = ids as unknown as string[];
    const danas = await this.tokenDanaCacheService.getTokenDanas(tokenIds);
    const data = tokenIds.map((tokenId, index) => {
      return danas[index] ?? new TokenDana({});
    });
    return Promise.resolve(data);
  });

  public readonly batchFollowersCount = new DataLoader<string, number>(async (ids: readonly string[]) => {
    const tokenIds = ids as unknown as string[];
    const tokenFollowersCounts = await this.followCacheService.getTokenFollowersCounts(tokenIds);
    const data = tokenIds.map((tokenId, index) => {
      return tokenFollowersCounts[index] ?? 0;
    });
    return Promise.resolve(data);
  });
}
