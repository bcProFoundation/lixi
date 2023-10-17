import _ from 'lodash';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkType } from '@bcpros/lixi-prisma';

@Injectable()
export class BookmarkCacheService {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  private async _cacheAccountBookmark(key: string, accountId: number) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: {
        accountId: accountId
      }
    });
    const promises = [];
    for (const bookmark of bookmarks) {
      promises.push(this.redis.zadd(key, bookmark.createdAt.getTime(), `${bookmark.type}:${bookmark.id}`));
    }
    return Promise.all(promises);
  }

  async getAccountBookmarks(accountId: number) {
    const key = `user:${accountId}:bookmarks`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountBookmark(key, accountId);
    }
    const bookmarks = await this.redis.zrevrange(key, 0, -1);
    return bookmarks.map(bookmark => _.toSafeInteger(bookmark));
  }

  async checkIfAccountBookmarked(accountId: number, bookmarkId: string, bookmarkType: BookmarkType) {
    const key = `user:${accountId}:bookmarks`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountBookmark(key, accountId);
    }
    return !!(await this.redis.zscore(key, `${bookmarkType}:${bookmarkId}`));
  }

  async removeBookmark(accountId: number, bookmarkId: string, bookmarkType: BookmarkType) {
    const key = `user:${accountId}:bookmarks`;
    await this.redis.zrem(key, `${bookmarkType}:${bookmarkId}`);
  }

  async createBookmark(accountId: number, bookmarkId: string, bookmarkType: BookmarkType, createdAt: Date) {
    const key = `user:${accountId}:bookmarks`;
    return this.redis.zadd(key, createdAt.getTime(), `${bookmarkType}:${bookmarkId}`);
  }

  async checkAccountBookmarkAll(accountId: number, bookmarkIds: string[], bookmarkType: BookmarkType) {
    const key = `user:${accountId}:followingPages`;
    const exist = await this.redis.exists([key]);
    let accountHaveBookmark;
    let listCheckAccountBookmark: boolean[] | (string | null)[] = [];

    if (!exist) {
      accountHaveBookmark = await this._cacheAccountBookmark(key, accountId);
    }
    if (accountHaveBookmark === null) {
      bookmarkIds.forEach((item, index) => {
        listCheckAccountBookmark[index] = false;
      });
      return listCheckAccountBookmark;
    }

    listCheckAccountBookmark = await this.redis.zmscore(key, ...bookmarkIds.map(id => `${bookmarkType}:${id}`));
    return listCheckAccountBookmark;
  }
}
