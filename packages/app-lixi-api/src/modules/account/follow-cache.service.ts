import _ from 'lodash';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { basicSortedSetPagination } from '../../common/custom-graphql-relay/paginate';

@Injectable()
export class FollowCacheService {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  private async _cacheAccountFollowers(key: string, accountId: number) {
    const followers = await this.prisma.followAccount.findMany({
      where: {
        followingAccountId: accountId
      }
    });
    const promises = [];
    for (const follower of followers) {
      promises.push(this.redis.zadd(key, follower.createdAt.getTime(), follower.followerAccountId));
    }
    return Promise.all(promises);
  }

  async getAccountFollowers(accountId: number) {
    const key = `user:${accountId}:followers`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountFollowers(key, accountId);
    }
    const followers = await this.redis.zrevrange(key, 0, -1);
    return followers.map(follower => _.toSafeInteger(follower));
  }

  async getAccountFollowersCount(accountId: number) {
    const key = `user:${accountId}:followers`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async getAccountFollowersCounts(accountIds: number[]) {
    // get the followers count for multiple accounts
    const promises = [];
    for (const accountId of accountIds) {
      const key = `user:${accountId}:followers`;
      promises.push(this.redis.zcard(key));
    }

    return Promise.all(promises);
  }

  private async _cacheAccountFollowings(key: string, accountId: number) {
    const followings = await this.prisma.followAccount.findMany({
      where: {
        followerAccountId: accountId
      }
    });

    const promises = [];
    for (const following of followings) {
      promises.push(this.redis.zadd(key, following.createdAt.getTime(), following.followingAccountId));
    }

    if (_.isNil(promises) || promises.length === 0) return null;

    return Promise.all(promises);
  }

  async getAccountFollowings(accountId: number) {
    const key = `user:${accountId}:followings`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountFollowings(key, accountId);
    }
    const followings = await this.redis.zrevrange(key, 0, -1);
    return followings.map(following => _.toSafeInteger(following));
  }

  async getAccountFollowingsCount(accountId: number) {
    const key = `user:${accountId}:followings`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async getAccountFollowingsCounts(accountIds: number[]) {
    // get the followings count for multiple accounts
    const promises = [];
    for (const accountId of accountIds) {
      const key = `user:${accountId}:followings`;
      promises.push(this.redis.zcard(key));
    }

    return Promise.all(promises);
  }

  private async _cachePageFollowers(key: string, pageId: string) {
    const followers = await this.prisma.followPage.findMany({
      where: {
        pageId: pageId
      }
    });

    const promises = [];
    for (const follower of followers) {
      promises.push(this.redis.zadd(key, follower.createdAt.getTime(), follower.accountId));
    }

    await Promise.all(promises);
  }

  async getPageFollowers(pageId: string) {
    const key = `page:${pageId}:followers`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowers(key, pageId);
    }
    const followers = await this.redis.zrevrange(key, 0, -1);
    return followers.map(follower => _.toSafeInteger(follower));
  }

  async getPageFollowersCount(pageId: string) {
    const key = `page:${pageId}:followers`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async getPageFollowersCounts(pageIds: string[]) {
    const promises = [];
    for (const pageId of pageIds) {
      const key = `page:${pageId}:followers`;
      promises.push(this.redis.zcard(key));
    }

    return Promise.all(promises);
  }

  private async _cachePageFollowingOfAccount(key: string, accountId: number) {
    const followings = await this.prisma.followPage.findMany({
      where: {
        AND: [{ accountId: accountId }, { pageId: { not: null } }]
      }
    });

    const promises = [];
    for (const following of followings) {
      promises.push(this.redis.zadd(key, following.createdAt.getTime(), following.pageId!));
    }

    if (_.isNil(promises) || promises.length === 0) return null;

    return Promise.all(promises);
  }

  async getPageFollowings(accountId: number) {
    const key = `user:${accountId}:followingPages`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowingOfAccount(key, accountId);
    }
    return await this.redis.zrevrange(key, 0, -1);
  }

  async getPageFollowingsCount(accountId: number) {
    const key = `user:${accountId}:followingPages`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async getPageFollowingsCounts(accountIds: number[]) {
    const promises = [];
    for (const accountId of accountIds) {
      const key = `user:${accountId}:followingPages`;
      promises.push(this.redis.zcard(key));
    }

    return Promise.all(promises);
  }

  private async _cacheTokenFollowers(key: string, tokenId: string) {
    const followers = await this.prisma.followPage.findMany({
      where: {
        tokenId: tokenId
      }
    });

    const promises = [];
    for (const follower of followers) {
      promises.push(this.redis.zadd(key, follower.createdAt.getTime(), follower.accountId));
    }

    await Promise.all(promises);
  }

  async getTokenFollowers(tokenId: string) {
    const key = `token:${tokenId}:followers`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheTokenFollowers(key, tokenId);
    }
    const followers = await this.redis.zrevrange(key, 0, -1);
    return followers.map(follower => _.toSafeInteger(follower));
  }

  async getTokenFollowersCount(tokenId: string) {
    const key = `token:${tokenId}:followers`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async getTokenFollowersCounts(tokenIds: string[]) {
    const promises = [];
    for (const tokenId of tokenIds) {
      const key = `token:${tokenId}:followers`;
      promises.push(this.redis.zcard(key));
    }

    return Promise.all(promises);
  }

  private async _cacheTokenFollowingOfAccount(key: string, accountId: number) {
    const followings = await this.prisma.followPage.findMany({
      where: {
        AND: [{ accountId: accountId }, { tokenId: { not: null } }]
      }
    });

    const promises = [];
    for (const following of followings) {
      promises.push(this.redis.zadd(key, following.createdAt.getTime(), following.tokenId!));
    }

    if (_.isNil(promises) || promises.length === 0) return null;

    return Promise.all(promises);
  }

  async getTokenFollowings(accountId: number) {
    const key = `user:${accountId}:followingTokens`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheTokenFollowingOfAccount(key, accountId);
    }
    return await this.redis.zrevrange(key, 0, -1);
  }

  async getTokenFollowingsCount(accountId: number) {
    const key = `user:${accountId}:followingTokens`;
    const count = await this.redis.zcard(key);
    return count || 0;
  }

  async checkIfAccountFollowPage(accountId: number, pageId: string) {
    const key = `user:${accountId}:followingPages`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowingOfAccount(key, accountId);
    }
    return !!(await this.redis.zscore(key, pageId));
  }

  async checkIfAccountFollowToken(accountId: number, tokenId: string) {
    const key = `user:${accountId}:followingTokens`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheTokenFollowingOfAccount(key, accountId);
    }
    return !!(await this.redis.zscore(key, tokenId));
  }

  async checkIfAccountFollowAccount(followerAccountId: number, followingAccountId: number) {
    const key = `user:${followerAccountId}:followings`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountFollowings(key, followerAccountId);
    }

    return !!(await this.redis.zscore(key, followingAccountId));
  }

  async removeFollowAccount(followerAccountId: number, followingAccountId: number) {
    const keyFollowers = `user:${followingAccountId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followings`;
    return Promise.all([
      this.redis.zrem(keyFollowers, followerAccountId),
      this.redis.zrem(keyFollowings, followingAccountId)
    ]);
  }

  async removeFollowPage(followerAccountId: number, pageId: string) {
    const keyFollowers = `page:${pageId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followingPages`;

    return Promise.all([this.redis.zrem(keyFollowers, followerAccountId), this.redis.zrem(keyFollowings, pageId)]);
  }

  async removeFollowToken(followerAccountId: number, tokenId: string) {
    const keyFollowers = `token:${tokenId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followingTokens`;

    return Promise.all([this.redis.zrem(keyFollowers, followerAccountId), this.redis.zrem(keyFollowings, tokenId)]);
  }

  async createFollowAccount(followerAccountId: number, followingAccountId: number, createdAt: Date) {
    const keyFollowers = `user:${followingAccountId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followings`;

    return Promise.all([
      this.redis.zadd(keyFollowers, createdAt.getTime(), followerAccountId),
      this.redis.zadd(keyFollowings, createdAt.getTime(), followingAccountId)
    ]);
  }

  async createFollowPage(followerAccountId: number, pageId: string, createdAt: Date) {
    const keyFollowers = `page:${pageId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followingPages`;

    return Promise.all([
      this.redis.zadd(keyFollowers, createdAt.getTime(), followerAccountId),
      this.redis.zadd(keyFollowings, createdAt.getTime(), pageId)
    ]);
  }

  async createFollowToken(followerAccountId: number, tokenId: string, createdAt: Date) {
    const keyFollowers = `token:${tokenId}:followers`;
    const keyFollowings = `user:${followerAccountId}:followingTokens`;

    return Promise.all([
      this.redis.zadd(keyFollowers, createdAt.getTime(), followerAccountId),
      this.redis.zadd(keyFollowings, createdAt.getTime(), tokenId)
    ]);
  }

  async checkAccountFollowAllAccount(followerAccountId: number, followingAccountIds: number[]) {
    const key = `user:${followerAccountId}:followings`;
    const exist = await this.redis.exists([key]);
    let accountHaveFollowing;
    let listCheckAccountFollowAccounts: boolean[] | (string | null)[] = [];

    if (!exist) {
      accountHaveFollowing = await this._cacheAccountFollowings(key, followerAccountId);
    }
    if (accountHaveFollowing === null) {
      followingAccountIds.forEach((item, index) => {
        listCheckAccountFollowAccounts[index] = false;
      });
      return listCheckAccountFollowAccounts;
    }

    listCheckAccountFollowAccounts = await this.redis.zmscore(key, ...followingAccountIds);
    return listCheckAccountFollowAccounts;
  }

  async checkAccountFollowAllPage(followerAccountId: number, pageIds: string[]) {
    const key = `user:${followerAccountId}:followingPages`;
    const exist = await this.redis.exists([key]);
    let accountHaveFollowingPage;
    let listCheckAccountFollowPages: boolean[] | (string | null)[] = [];

    if (!exist) {
      accountHaveFollowingPage = await this._cachePageFollowingOfAccount(key, followerAccountId);
    }
    if (accountHaveFollowingPage === null) {
      pageIds.forEach((item, index) => {
        listCheckAccountFollowPages[index] = false;
      });
      return listCheckAccountFollowPages;
    }

    listCheckAccountFollowPages = await this.redis.zmscore(key, ...pageIds);
    return listCheckAccountFollowPages;
  }

  async checkAccountFollowAllToken(followerAccountId: number, tokenIds: string[]) {
    const key = `user:${followerAccountId}:followingTokens`;
    const exist = await this.redis.exists([key]);
    let accountHaveFollowingToken;

    if (!exist) {
      accountHaveFollowingToken = await this._cacheTokenFollowingOfAccount(key, followerAccountId);
    }

    const listCheckAccountFollowTokens = await this.redis.zmscore(key, ...tokenIds);
    return listCheckAccountFollowTokens.map(item => !!item);
  }

  async getPaginatedPageFollowings(accountId: number, first: number, after?: string) {
    const key = `user:${accountId}:followingPages`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowingOfAccount(key, accountId);
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }

  async getPaginatedFollowersByPage(pageId: string, first: number, after?: string) {
    const key = `page:${pageId}:followers`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowers(key, pageId);
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }

  async getPaginatedTokenFollowings(accountId: number, first: number, after?: string) {
    const key = `user:${accountId}:followingTokens`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheTokenFollowingOfAccount(key, accountId);
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }

  async getPaginatedFollowersByToken(tokenId: string, first: number, after?: string) {
    const key = `page:${tokenId}:followers`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cachePageFollowers(key, tokenId);
    }
    return await basicSortedSetPagination(this.redis, key, first, after);
  }
}
