import { AccountDana } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { AccountDanaCacheService } from './account-dana-cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export default class AccountLoader {
  constructor(
    private readonly accountDanaCacheService: AccountDanaCacheService,
    private readonly followCacheService: FollowCacheService,
    private readonly prisma: PrismaService
  ) {}

  public readonly batchAccountDanas = new DataLoader<number, AccountDana>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];
    const accountDanas = await this.accountDanaCacheService.getAccountDanas(accountIds);
    const data = accountIds.map((accountId, index) => {
      return accountDanas[index] ?? new AccountDana({});
    });
    return Promise.resolve(data);
  });

  public readonly batchAccountHash160s = new DataLoader<number, string>(async (ids: readonly number[]) => {
    const accountIds = ids as unknown as number[];

    const allAccount = await this.prisma.account.findMany({
      where: {
        id: { in: accountIds }
      }
    });

    const mapAccountHash = new Map(
      allAccount.map(account => {
        return [account.id, account.hash160];
      })
    );

    const data = accountIds.map((accountId, index) => {
      return mapAccountHash.get(accountId)?.toString('hex') ?? '';
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
