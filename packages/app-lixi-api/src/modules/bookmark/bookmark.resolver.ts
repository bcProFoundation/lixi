import {
  Account,
  PaginationArgs,
  Bookmark,
  BookmarkConnection,
  BookmarkOrder,
  CreateBookmarkInput,
  RemoveBookmarkInput,
  BookmarkType as BookmarkTypeEnum
} from '@bcpros/lixi-models';
import { BookmarkType } from '@bcpros/lixi-prisma';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { AccountEntity } from 'src/decorators/account.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkCacheService } from './bookmark-cache.service';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Bookmark)
@UseFilters(GqlHttpExceptionFilter)
export class BookmarkResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    private bookmarkCacheService: BookmarkCacheService
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

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => BookmarkConnection)
  async allBookmarkByAccountId(
    @AccountEntity() account: Account,
    @Args() { after, before, first, last }: PaginationArgs,
    @Args('bookmarkType', { type: () => BookmarkTypeEnum }) bookmarkType: BookmarkTypeEnum,
    @Args({ name: 'accountId', type: () => Number })
    accountId: number,
    @Args({
      name: 'orderBy',
      type: () => BookmarkOrder,
      nullable: true
    })
    orderBy: BookmarkOrder
  ) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const result = await findManyCursorConnection(
      args =>
        this.prisma.bookmark.findMany({
          where: {
            OR: [
              {
                account: {
                  id: accountId
                }
              },
              {
                type: bookmarkType ?? undefined
              }
            ]
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.bookmark.count({
          where: {
            OR: [
              {
                account: {
                  id: accountId
                }
              },
              {
                type: bookmarkType ?? undefined
              }
            ]
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Bookmark)
  async createBookmark(@AccountEntity() account: Account, @Args('data') data: CreateBookmarkInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { bookmarkId, bookmarkType } = data;

    const exsitedBookmark = await this.prisma.bookmark.findFirst({
      where: {
        account: {
          id: account.id
        },
        bookmarkId: bookmarkId,
        type: bookmarkType
      }
    });

    if (exsitedBookmark) {
      const bookmarkExisted = 'Bookmark existed';
      throw new Error(bookmarkExisted);
    }

    const result = await this.prisma.bookmark.create({
      data: {
        account: {
          connect: {
            id: account.id
          }
        },
        bookmarkId: bookmarkId,
        type: bookmarkType
      },
      include: {
        account: true
      }
    });

    await this.bookmarkCacheService.createBookmark(account.id, bookmarkId, bookmarkType, result.createdAt);

    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Bookmark)
  async removeBookmark(@AccountEntity() account: Account, @Args('data') data: RemoveBookmarkInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { id } = data;

    const bookmark = await this.prisma.bookmark.findFirst({
      where: {
        bookmarkId: id,
        account: {
          id: account.id
        }
      }
    });

    if (!bookmark) {
      const bookmarkNotFound = 'Bookmark not found';
      throw new Error(bookmarkNotFound);
    }

    const result = await this.prisma.bookmark.delete({
      where: {
        id: bookmark.id
      },
      include: {
        account: true
      }
    });

    await this.bookmarkCacheService.removeBookmark(account.id, id, bookmark.type!);

    return result;
  }

  @Query(() => Boolean)
  @UseGuards(GqlJwtAuthGuard)
  async checkIfHasBookmarked(
    @AccountEntity() account: Account,
    @Args('bookmarkId', { type: () => String }) bookmarkId: string,
    @Args('bookmarkType', { type: () => BookmarkTypeEnum }) bookmarkType: BookmarkTypeEnum
  ) {
    if (!account) {
      return false;
    }

    // We need to find out if the account follow the page or not
    return await this.bookmarkCacheService.checkIfAccountBookmarked(account.id, bookmarkId!, bookmarkType);
  }
}
