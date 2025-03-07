import {
  Account,
  AccountBasicConnection,
  AccountDana,
  AccountStatsOrder,
  BankInfo,
  BasicPaginationArgs,
  FollowOfType,
  IBasicPaginated,
  PaginationArgs,
  UpdateAccountInput
} from '@bcpros/lixi-models';
import { ImageUploadableType } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { HttpException, HttpStatus, Inject, UseFilters, UseGuards, Logger } from '@nestjs/common';
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { PubSub } from 'graphql-subscriptions';
import Redis from 'ioredis';
import _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { basicPaginate, createEdge } from 'src/common/custom-graphql-relay/paginate';
import { AccountEntity, PageAccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { template } from 'src/utils/stringTemplate';
import VError from 'verror';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WALLET_SERVICES, XPIJS } from '../wallet/wallet.constants';
import { WalletService } from '../wallet/wallet.service';
import { AccountCacheService } from './account-cache.service';
import AccountLoader from './account.loader';
import { FollowCacheService } from './follow-cache.service';
import TotalDanaViewScoreLoader from './total-dana-view-score.loader';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { KEY_AVATAR_PATH } from '../escrow/escrow.contants';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Account)
@UseFilters(GqlHttpExceptionFilter)
export class AccountResolver {
  static topAccountWeekKey = 'topAccountDanaGiven:weekly:{{weekNumber}}:{{year}}';
  static topAccountMonthKey = 'topAccountDanaGiven:monthly:{{monthNumber}}:{{year}}';

  constructor(
    private prisma: PrismaService,
    @Inject(WALLET_SERVICES) private walletServices: { [currency: string]: WalletService },
    @I18n() private i18n: I18nService,
    private readonly accountCacheService: AccountCacheService,
    private readonly accountLoader: AccountLoader,
    private readonly followCacheService: FollowCacheService,
    private readonly totalDanaViewScoreLoader: TotalDanaViewScoreLoader,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectRedis() private readonly redis: Redis
  ) {}

  @Query(() => Account)
  @UseGuards(GqlJwtAuthGuard)
  async account(@AccountEntity() myAccount: Account, @Args('id', { type: () => Number }) id: number) {
    if (!myAccount) {
      const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
      throw new VError(accountNotExistMessage);
    }

    if (myAccount.id !== id) {
      const noPermissionMessage = await this.i18n.t('account.messages.noPermission');
      throw new VError(noPermissionMessage);
    }

    try {
      let account = await this.accountCacheService.getById(id);

      if (!account) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = _.omit(
        {
          ...account
        },
        'encryptedMnemonic',
        'encryptedSecret',
        'mnemonicHash',
        'notifications'
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await this.i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Mutation(() => Account)
  async updateAccountTelegramUsername(
    @Args('telegramId', { type: () => String }) telegramId: string,
    @Args('telegramUsername', { type: () => String }) telegramUsername: string
  ) {
    try {
      const result = await this.prisma.account.update({
        where: {
          telegramId
        },
        data: {
          telegramUsername
        }
      });

      //remove cache
      await this.accountCacheService.removeByKeys([result.id.toString(), result.address, result.mnemonicHash!]);
      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await this.i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Query(() => Account)
  async getAccountByAddress(@Args('address', { type: () => String }) address: string) {
    try {
      const account = await this.accountCacheService.getByAddress(address);

      if (!account) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const result = _.omit(
        {
          ...account
        },
        'encryptedMnemonic',
        'encryptedSecret',
        'mnemonicHash',
        'notifications'
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableGetAccountMessage = await this.i18n.t('account.messages.unableGetAccount');
        const error = new VError.WError(err as Error, unableGetAccountMessage);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Query(() => String, { nullable: true })
  @UseGuards(GqlJwtAuthGuard)
  async getTelegramAvatarPath(@AccountEntity() account: Account) {
    if (!account) {
      throw new Error('Account not found');
    }
    try {
      const botToken = this.configService.get('TELEGRAM_LOCAL_ECASH_BOT_TOKEN');
      const telegramId = account.telegramId;

      // Get user profile photos
      const photoResponse = await firstValueFrom(
        this.httpService.get(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos`, {
          params: { user_id: telegramId, limit: 1 }
        })
      );

      if (!photoResponse.data.ok || !photoResponse.data.result.photos.length) {
        return;
      }

      // Get file path
      const fileId = photoResponse.data.result.photos[0][0].file_id;
      const fileResponse = await firstValueFrom(
        this.httpService.get(`https://api.telegram.org/bot${botToken}/getFile`, { params: { file_id: fileId } })
      );

      if (!fileResponse.data.ok) {
        return null;
      }

      const filePath = fileResponse.data.result.file_path;

      // Store the path
      await this.redis.hset(KEY_AVATAR_PATH, account.id, filePath);

      return filePath;
    } catch (err) {
      this.logger.error(err);
    }
  }

  @Query(() => AccountBasicConnection)
  async allFollowersByPage(
    @Args() { after, first = 20 }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string
  ) {
    const paginated = await this.followCacheService.getPaginatedFollowersByPage(id, first, after);
    const accountIds = paginated.edges.map(item => Number(item.cursor));
    const accounts = await this.accountCacheService.getByIds(accountIds);
    return {
      ...paginated,
      edges: accounts.map(account => (account ? createEdge<Account>(account, 'id') : null))
    } as IBasicPaginated<Account>;
  }

  @Query(() => AccountBasicConnection)
  async allFollowersByToken(
    @Args() { after, first = 20 }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string
  ) {
    const paginated = await this.followCacheService.getPaginatedFollowersByToken(id, first, after);
    const accountIds = paginated.edges.map(item => Number(item.cursor));
    const accounts = await this.accountCacheService.getByIds(accountIds);
    return {
      ...paginated,
      edges: accounts.map(account => (account ? createEdge<Account>(account, 'id') : null))
    } as IBasicPaginated<Account>;
  }

  @Query(() => AccountBasicConnection)
  async allAccounts(@Args() { first = 20, after }: PaginationArgs) {
    const topAccountIds = await this.prisma.accountDana.findMany({
      where: { danaGiven: { gt: 0 } },
      orderBy: { danaGiven: 'desc' },
      take: first
    });
    const accountIds = topAccountIds.map(item => item.accountId);
    const accounts = await this.accountCacheService.getByIds(accountIds);

    const paginated = await basicPaginate(accountIds, accountIds.length, accountIds[0]);
    return {
      ...paginated,
      edges: accounts.map((account, index) =>
        account ? createEdge<Account>({ ...account, rankNumber: index + 1 }, 'id') : null
      )
    } as IBasicPaginated<Account>;
  }

  @Query(() => AccountBasicConnection)
  async topWeekAccountDanaGiven(
    @Args() { first = 20, after }: PaginationArgs,
    @Args('week', { type: () => Int }) week: number,
    @Args('year', { type: () => Int }) year: number
  ) {
    const weekKey = template(AccountResolver.topAccountWeekKey, {
      weekNumber: week,
      year: year
    });
    const accountIdScores = await this.redis.zrevrange(weekKey, 0, first - 1, 'WITHSCORES');
    const accountIdScoresNumber = accountIdScores.map(item => Number(item));

    //redis return array with even position is member and odd postion is score
    const accountIds = accountIdScoresNumber.filter((_, index) => index % 2 === 0);
    const accountScores = accountIdScoresNumber.filter((_, index) => index % 2 !== 0);

    const accounts = await this.accountCacheService.getByIds(accountIds);

    const paginated = await basicPaginate(accountIds, accountIds.length, accountIds[0]);
    return {
      ...paginated,
      edges: accounts.map((account, index) =>
        account
          ? createEdge<Account>({ ...account, rankNumber: index + 1, rankScore: accountScores[index] }, 'id')
          : null
      )
    } as IBasicPaginated<Account>;
  }

  @Query(() => AccountBasicConnection)
  async topMonthAccountDanaGiven(
    @Args() { first = 20, after }: PaginationArgs,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number
  ) {
    const monthKey = template(AccountResolver.topAccountMonthKey, {
      monthNumber: month,
      year: year
    });
    const accountIdScores = await this.redis.zrevrange(monthKey, 0, first - 1, 'WITHSCORES');
    const accountIdScoresNumber = accountIdScores.map(item => Number(item));

    //redis return array with even position is member and odd postion is score
    const accountIds = accountIdScoresNumber.filter((_, index) => index % 2 === 0);
    const accountScores = accountIdScoresNumber.filter((_, index) => index % 2 !== 0);

    const accounts = await this.accountCacheService.getByIds(accountIds);

    const paginated = await basicPaginate(accountIds, accountIds.length, accountIds[0]);
    return {
      ...paginated,
      edges: accounts.map((account, index) =>
        account
          ? createEdge<Account>({ ...account, rankNumber: index + 1, rankScore: accountScores[index] }, 'id')
          : null
      )
    } as IBasicPaginated<Account>;
  }

  @UseGuards(GqlJwtAuthGuardByPass)
  @Mutation(() => Account)
  async updateAccount(@PageAccountEntity() account: Account, @Args('data') data: UpdateAccountInput) {
    const { avatar: avatarId, cover: coverId, id } = data;

    /*Account Avatar*/
    if (avatarId) {
      await this.prisma.$transaction(async prisma => {
        //find account avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                uploads: {
                  every: {
                    id: avatarId
                  }
                }
              }
            ]
          }
        });

        if (result) {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: avatarId
                }
              },
              accountAvatar: {
                connect: {
                  id: account.id
                }
              },
              type: ImageUploadableType.ACCOUNT_AVATAR
            }
          });

          return result;
        }
      });
    }

    /*Account Cover*/
    if (coverId) {
      await this.prisma.$transaction(async prisma => {
        //find page avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                uploads: {
                  every: {
                    id: coverId
                  }
                }
              }
            ]
          }
        });

        if (result) {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: coverId
                }
              },
              accountCover: {
                connect: {
                  id: account.id
                }
              },
              type: ImageUploadableType.ACCOUNT_COVER
            }
          });

          return result;
        }
      });
    }

    const updatedAccount = await this.prisma.account.update({
      where: {
        id: id ?? _.toSafeInteger(account.id)
      },
      data: {
        ..._.omit(data, ['id', 'avatar', 'cover']),
        updatedAt: new Date()
      }
    });
    await this.accountCacheService.removeByKeys([
      updatedAccount.id.toString(),
      updatedAccount.address,
      updatedAccount.mnemonicHash!
    ]);

    //save to cache
    const cachedAccount = await this.accountCacheService.getById(updatedAccount.id);
    await this.accountCacheService.getByAddress(updatedAccount.address);

    const result = _.omit(
      {
        ...cachedAccount
      },
      'encryptedMnemonic',
      'encryptedSecret',
      'mnemonicHash',
      'notifications'
    );
    pubSub.publish('pageUpdated', { accountUpdated: result });
    return result;
  }

  @ResolveField('accountDana', () => AccountDana)
  async accountDana(@Parent() account: Account) {
    return this.accountLoader.batchAccountDanas.load(account.id);
  }

  @ResolveField('followersCount', () => Number)
  async followersCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowersCount.load(account.id);
  }

  @ResolveField('followingsCount', () => Number)
  async followingsCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowingsCount.load(account.id);
  }

  @ResolveField('followingPagesCount', () => Number)
  async followingPagesCount(@Parent() account: Account) {
    return this.accountLoader.batchFollowingPagesCount.load(account.id);
  }

  @ResolveField('totalDanaViewScore', () => Number)
  async totalDanaViewScore(@Parent() account: Account) {
    const followOfType: FollowOfType = {
      accountId: account.id
    };

    return this.totalDanaViewScoreLoader.batchTotalDanaViewScore.load(followOfType);
  }

  @ResolveField('hash160', () => String)
  async hash160(@Parent() account: Account) {
    return this.accountLoader.batchAccountHash160s.load(account.id);
  }

  @ResolveField('accountStatsOrder', () => AccountStatsOrder)
  async accountStatsOrder(@Parent() account: Account) {
    return this.accountLoader.batchAccountStatsOrder.load(account.id);
  }

  @ResolveField('bankInfo', () => BankInfo)
  async bankInfo(@Parent() account: Account) {
    return this.accountLoader.batchBankInfo.load(account.id.toString());
  }

  @ResolveField('localeCashPathAvatar', () => String)
  async localeCashPathAvatar(@Parent() account: Account) {
    return this.accountLoader.batchLocaleCashPathAvatar.load(account.id.toString());
  }
}
