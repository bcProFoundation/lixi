import {
  Account,
  BasicPaginationArgs,
  Bookmark,
  CreateBookmarkInput,
  IBasicPaginated,
  RemoveBookmarkInput,
  TimelineItem,
  TimelineItemConnection
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkCacheService } from './bookmark-cache.service';
import { BookmarkType } from '@bcpros/lixi-prisma';
import { PostCacheService } from '../page/post-cache.service';
import { TimelineItemService } from '../timeline/timeline-item.service';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Bookmark)
@UseFilters(GqlHttpExceptionFilter)
export class BookmarkResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private bookmarkCacheService: BookmarkCacheService,
    private readonly timelineItemService: TimelineItemService,
    private postCacheService: PostCacheService
  ) {}

  @Subscription(() => Bookmark)
  bookmarkCreated() {
    return pubSub.asyncIterator('bookmarkCreated');
  }

  @Query(() => Bookmark)
  async bookmark(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.bookmark.findUnique({
      where: { id: id }
    });

    return result;
  }

  @SkipThrottle()
  @Query(() => TimelineItemConnection)
  @UseFilters(GqlHttpExceptionFilter)
  @UseGuards(GqlJwtAuthGuard)
  async bookmarkTimeline(
    @AccountEntity() account: Account,
    @Args() { after, first }: BasicPaginationArgs,
    @Args('id', { type: () => Number }) id: number
  ) {
    if (!account || account.id != id) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const paginated = await this.bookmarkCacheService.getBookmarkPaginatedTimeline(id, first, after);
    const timelineIds = paginated.edges.map(item => item.cursor);
    const timelines = await this.timelineItemService.getByIds(timelineIds);

    const result = {
      ...paginated,
      edges: timelines.map(timeline => (timeline ? createEdge<TimelineItem>(timeline, 'id') : null))
    } as IBasicPaginated<TimelineItem>;

    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Bookmark)
  async createBookmark(@AccountEntity() account: Account, @Args('data') data: CreateBookmarkInput) {
    try {
      const { bookmarkForId, accountId } = data;
      if (!account || account.id !== accountId) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const currentPost = await this.prisma.post.findFirst({
        where: { id: bookmarkForId }
      });

      const result = await this.prisma.$transaction(async prisma => {
        //check post have bookmarkableId
        if (currentPost?.bookmarkableId) {
          //create bookmark and connect to bookmarkable
          const bookmark = await prisma.bookmark.create({
            data: {
              account: { connect: { id: accountId } },
              bookmarkable: { connect: { id: currentPost.bookmarkableId } }
            }
          });

          return bookmark;
        } else {
          //create bookmarkable and connect post
          const bookmarkable = await prisma.bookmarkable.create({
            data: {
              type: BookmarkType.POST,
              post: { connect: { id: bookmarkForId } }
            }
          });

          //create bookmark
          const bookmark = await prisma.bookmark.create({
            data: {
              account: { connect: { id: accountId } },
              bookmarkable: { connect: { id: bookmarkable.id } }
            }
          });
          return bookmark;
        }
      });

      const timelineBookmarkId = `${currentPost?.type}:${currentPost?.id}`;
      //clear cache of post and cache bookmark
      await Promise.all([
        this.postCacheService.removeByKeys([bookmarkForId]),
        this.bookmarkCacheService.cacheBookmark(accountId, result.createdAt.getTime(), timelineBookmarkId)
      ]);

      return result;
    } catch (error) {
      this.logger.error(error);
    }
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Bookmark)
  async removeBookmark(@AccountEntity() account: Account, @Args('data') data: RemoveBookmarkInput) {
    try {
      const { accountId, bookmarkForId } = data;
      if (!account || account.id !== accountId) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      if (!bookmarkForId) return;
      const currentPost = await this.prisma.post.findFirst({
        where: { id: bookmarkForId }
      });

      if (currentPost?.bookmarkableId) {
        const removedBookmark = await this.prisma.bookmark.deleteMany({
          where: {
            bookmarkableId: currentPost.bookmarkableId,
            accountId: accountId
          }
        });

        const timelineBookmarkId = `${currentPost?.type}:${currentPost?.id}`;
        //clear post-bookmark cache
        await Promise.all([
          this.postCacheService.removeByKeys([currentPost?.id || '']),
          this.bookmarkCacheService.removeBookmark(accountId, [timelineBookmarkId])
        ]);

        return removedBookmark;
      } else {
        this.logger.error("Can't find bookmarkable for this post");
        return;
      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
