import { AccountDana, AccountStatsOrder, BankInfo } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { FollowCacheService } from '../account/follow-cache.service';
import { AccountDanaCacheService } from './account-dana-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@bcpros/lixi-prisma';
import { KEY_BANK_INFO } from 'src/utils/escrow/cache-key.constants';
import Redis from 'ioredis';
import { decode } from '@msgpack/msgpack';
import { InjectRedis } from '@songkeys/nestjs-redis';

@Injectable({ scope: Scope.REQUEST })
export default class AccountLoader {
  constructor(
    private readonly accountDanaCacheService: AccountDanaCacheService,
    private readonly followCacheService: FollowCacheService,
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
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

  public readonly batchBankInfo = new DataLoader<string, BankInfo>(async (ids: readonly string[]) => {
    const DEFAULT_BANK_INFO: BankInfo = {
      id: '',
      orderId: '',
      bankName: '',
      accountNameBank: '',
      accountNumberBank: '',
      appName: '',
      accountNameApp: '',
      accountNumberApp: ''
    };
    const accountIds = [...ids];

    const results = await this.redis.hmgetBuffer(KEY_BANK_INFO, ...accountIds);

    const bankInfos = accountIds.map((_, index) => {
      const raw = results[index];
      if (!raw) {
        return { ...DEFAULT_BANK_INFO };
      }

      try {
        const parsed = decode(raw) as BankInfo;
        return parsed;
      } catch (error) {
        return { ...DEFAULT_BANK_INFO };
      }
    });

    return bankInfos;
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

  public readonly batchAccountStatsOrder = new DataLoader<number, AccountStatsOrder>(
    async (accountIds: readonly number[]) => {
      const ids = accountIds as number[];

      // Perform a single raw query to gather stats for all requested IDs
      // We identify which account an escrow_order row belongs to by checking
      // whether the seller or buyer is in the requested list, then grouping by that account.
      const rawQuery = Prisma.sql`
        WITH 
        SellerPrecomputed AS (
          SELECT
            eo.*,
            d.status AS dispute_status,
            eo.seller_account_id AS relevant_account_id
          FROM escrow_order eo
          LEFT JOIN dispute d ON eo.id = d.escrow_order_id
          WHERE eo.seller_account_id = ANY(${ids})
        ),
        BuyerPrecomputed AS (
          SELECT
            eo.*,
            d.status AS dispute_status,
            eo.buyer_account_id AS relevant_account_id
          FROM escrow_order eo
          LEFT JOIN dispute d ON eo.id = d.escrow_order_id
          WHERE eo.buyer_account_id = ANY(${ids})
        ),
        -- UNION them so a single escrow_order row is counted once per matching account
        Precomputed AS (
          SELECT * FROM SellerPrecomputed
          UNION ALL
          SELECT * FROM BuyerPrecomputed
        ),
        OverallStats AS (
            SELECT 
                relevant_account_id,
                COALESCE(SUM(eo.seller_donate_amount), 0) + 
                COALESCE(SUM(eo.buyer_donate_amount), 0) AS donation_amount,
                SUM(
                  CASE 
                    WHEN eo.status = 'COMPLETE' THEN 1 
                    ELSE 0 
                  END
                ) AS completed_order,
                COUNT(
                  DISTINCT
                    CASE
                    WHEN eo.status = 'COMPLETE' THEN
                      LEAST(seller_account_id, buyer_account_id)::TEXT
                      || '_' ||
                      GREATEST(seller_account_id, buyer_account_id)::TEXT
                      ELSE NULL
                    END
                  ) AS unique_trades
            FROM Precomputed eo
            GROUP BY relevant_account_id
        )
        
        SELECT 
            relevant_account_id,
            donation_amount,
            completed_order,
            unique_trades
        FROM OverallStats
      `;

      const rows = await this.prisma.$queryRaw<
        {
          relevant_account_id: number;
          donation_amount: number;
          completed_order: bigint;
          unique_trades: bigint;
        }[]
      >(rawQuery);

      // Convert each row into a map keyed by relevant_account_id
      const statsMap = new Map<number, AccountStatsOrder>();
      rows.forEach(row => {
        statsMap.set(row.relevant_account_id, {
          donationAmount: row.donation_amount,
          completedOrder: Number(row.completed_order),
          uniqueTrades: Number(row.unique_trades)
        });
      });

      // Return results in the same order as the incoming accountIds
      return ids.map(accountId => {
        return (
          statsMap.get(accountId) ?? {
            donationAmount: 0,
            completedOrder: 0,
            uniqueTrades: 0
          }
        );
      });
    }
  );
}
