import _ from 'lodash';
import { decode, encode } from '@msgpack/msgpack';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { Bookmark, BookmarkType } from '@bcpros/lixi-models';
import { template } from 'src/utils/stringTemplate';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';

@Injectable()
export class BookmarkCacheService {
  private logger: Logger = new Logger(this.constructor.name);

  static keyPrefix = 'timeline:bookmark:{{userId}}';

  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  async getBookmarkPaginatedTimeline(accountId: number, first: number = 20, after?: string) {
    const key = template(`${BookmarkCacheService.keyPrefix}`, { userId: accountId });

    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this._cacheBookmarkTimeline(accountId, key, after);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    //cache again for sure
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginated = await this._cacheBookmarkTimeline(accountId, key, after);
      if (shouldPaginated) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }

    //nothing change
    return paginated;
  }

  async _cacheBookmarkTimeline(accountId: number, key: string, after?: string) {
    try {
      const bookmarks = await this.prisma.bookmark.findMany({
        where: { accountId: accountId },
        include: { bookmarkable: { include: { post: true } } },
        orderBy: { createdAt: 'desc' },
        cursor: after ? { id: after } : undefined,
        take: 1000
      });

      //check account have bookmark
      if (bookmarks.length === 0) return false;

      const pipeline = this.redis.pipeline();

      for (const bookmark of bookmarks) {
        const post = bookmark.bookmarkable?.post;
        const id = `${post?.type}:${post?.id}`;
        pipeline.zadd(key, bookmark.createdAt.getTime(), id);
      }

      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async checkAccountBookmarkAllPost(listTimelineIds: string[], accountId: number) {
    const key = template(`${BookmarkCacheService.keyPrefix}`, { userId: accountId });
    const exist = await this.redis.exists([key]);

    let listCheckAccountBookmarkPost: boolean[] | (string | null)[] = [];

    if (!exist) {
      const userHaveBookmark = await this._cacheBookmarkTimeline(accountId, key);
      //user dont have bookmark => return false list
      if (!userHaveBookmark) {
        listTimelineIds.forEach((item, index) => {
          listCheckAccountBookmarkPost[index] = false;
        });

        return listCheckAccountBookmarkPost;
      }
    }

    listCheckAccountBookmarkPost = await this.redis.zmscore(key, ...listTimelineIds);
    return listCheckAccountBookmarkPost;
  }

  async cacheBookmark(accountId: number, score: number, id: string) {
    try {
      const key = template(`${BookmarkCacheService.keyPrefix}`, { userId: accountId });
      await this.redis.zadd(key, score || 0, id);
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async removeBookmark(accountId: number, ids: string[]) {
    try {
      const key = template(`${BookmarkCacheService.keyPrefix}`, { userId: accountId });
      await this.redis.zrem(key, ...ids);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
