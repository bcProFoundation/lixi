import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { Bookmark, BookmarkType } from '@bcpros/lixi-models';

@Injectable()
export class BookmarkCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:bookmarks:item-data';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  async getById(id: string): Promise<Nullable<Bookmark>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbItem = await this.prisma.bookmark.findUnique({
        where: {
          id: id
        }
      });
      if (!dbItem) return null;

      const bookmark: Bookmark = new Bookmark({
        ...dbItem
      });
      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(bookmark)));
      return bookmark;
    }

    return decode(buffer) as Bookmark;
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Bookmark;
        return [item.id, item];
      })
    );
    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.comment.findMany({
            where: {
              id: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map(dbValue => {
        const item = new Bookmark({
          ...dbValue
        });
        itemsMap.set(dbValue.id, item);
        return [dbValue.id, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ?? null;
    });
  }

  private async _cacheAccountBookmark(key: string, accountId: number) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: {
        accountId: accountId
      },
      include: {
        bookmarkable: true
      }
    });
    const promises = [];
    for (const bookmark of bookmarks) {
      const bookmarkable = bookmark.bookmarkable;
      promises.push(
        this.redis.zadd(key, bookmark.createdAt.getTime(), `${bookmarkable.type}:${bookmarkable.id}:${bookmark.id}`)
      );
    }
    return Promise.all(promises);
  }

  async getAccountBookmarks(accountId: number, first: number = 20, after?: string) {
    const key = `user:${accountId}:bookmarks`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountBookmark(key, accountId);
    }
    const totalCount = await this.redis.zcard(key);
    if (after) {
      const startOffset = await this.redis.zrank(key, after);
      if (startOffset === null) {
        // Cannot find the cursor in the sorted set
        return {
          totalCount,
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: after
          }
        };
      } else {
        const endOffset = startOffset + first;
        const ids = await this.redis.zrevrange(key, startOffset + 1, endOffset);
        const edges = ids.map((value, index) => {
          return {
            cursor: value,
            node: value
          };
        });
        const firstEdge = edges[0];
        const lastEdge = edges[edges.length - 1];
        return {
          totalCount,
          edges,
          pageInfo: {
            startCursor: firstEdge ? firstEdge.cursor : undefined,
            endCursor: lastEdge ? lastEdge.cursor : undefined,
            hasPreviousPage: true,
            hasNextPage: endOffset < totalCount
          }
        };
      }
    } else {
      // Get data from start
      const startOffset = 0;
      const endOffset = startOffset + first;
      const ids = await this.redis.zrange(key, startOffset, startOffset + first - 1);
      const edges = ids.map((value, index) => {
        return {
          cursor: value,
          node: value
        };
      });
      const firstEdge = edges[0];
      const lastEdge = edges[edges.length - 1];
      return {
        totalCount,
        edges,
        pageInfo: {
          startCursor: firstEdge ? firstEdge.cursor : undefined,
          endCursor: lastEdge ? lastEdge.cursor : undefined,
          hasPreviousPage: true,
          hasNextPage: endOffset < totalCount
        }
      };
    }
  }

  async checkIfAccountBookmarked(
    accountId: number,
    bookmarkId: string,
    bookmarkableId: string,
    bookmarkType: BookmarkType
  ) {
    const key = `user:${accountId}:bookmarks`;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheAccountBookmark(key, accountId);
    }
    return !!(await this.redis.zscore(key, `${bookmarkType}:${bookmarkableId}:${bookmarkId}`));
  }

  async removeBookmark(accountId: number, bookmarkId: string, bookmarkableId: string, bookmarkType: string) {
    const key = `user:${accountId}:bookmarks`;
    await this.redis.zrem(key, `${bookmarkType}:${bookmarkableId}:${bookmarkId}`);
  }

  async createBookmark(
    accountId: number,
    bookmarkId: string,
    bookmarkableId: string,
    bookmarkType: string,
    createdAt: Date
  ) {
    const key = `user:${accountId}:bookmarks`;
    return this.redis.zadd(key, createdAt.getTime(), `${bookmarkType}:${bookmarkableId}:${bookmarkId}`);
  }
}
