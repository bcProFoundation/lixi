import { AccountAddress, AccountDana } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { AccountDanaCacheService } from './account-dana-cache.service';
import { AccountAddressCacheService } from './account-address-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class AccountLoader {
  constructor(
    private readonly accountDanaCacheService: AccountDanaCacheService,
    private readonly accountAddressCacheService: AccountAddressCacheService,
    private readonly followCacheService: FollowCacheService
  ) {}

  public readonly batchAccountDanas = new DataLoader<number, AccountDana>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountDanas = await this.accountDanaCacheService.getAccountDanas(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountDanas[index] ?? new AccountDana({});
    });
    return Promise.resolve(data);
  });

  public readonly batchAccountAddresses = new DataLoader<number, AccountAddress>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountAddresses = await this.accountAddressCacheService.getAccountAddresses(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountAddresses[index] ?? new AccountAddress({});
    });
    return Promise.resolve(data);
  });

  public readonly batchFollowersCount = new DataLoader<number, number>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountFollowersCounts = await this.followCacheService.getAccountFollowersCounts(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountFollowersCounts[index] ?? 0;
    });
    return Promise.resolve(data);
  });

  public readonly batchFollowingsCount = new DataLoader<number, number>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountFollowingsCounts = await this.followCacheService.getAccountFollowingsCounts(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountFollowingsCounts[index] ?? 0;
    });
    return Promise.resolve(data);
  });

  public readonly batchFollowingPagesCount = new DataLoader<number, number>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountFollowingPagesCounts = await this.followCacheService.getPageFollowingsCounts(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountFollowingPagesCounts[index] ?? 0;
    });
    return Promise.resolve(data);
  });
}
