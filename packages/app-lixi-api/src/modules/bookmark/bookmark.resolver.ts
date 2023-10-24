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
  @Mutation(() => Bookmark)
  async createBookmark(@AccountEntity() account: Account, @Args('data') data: CreateBookmarkInput) {
    if (!account || account.id !== data.accountId) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { accountId, bookmarkableId } = data;

    const bookmarkable = await this.prisma.bookmarkable.findUnique({
      where: {
        id: bookmarkableId
      }
    });

    if (!bookmarkable) {
      throw new Error('Could not create bookmark');
    }

    const result = await this.prisma.bookmark.create({
      data: {
        account: {
          connect: {
            id: account.id
          }
        },
        bookmarkable: {
          connect: {
            id: bookmarkableId
          }
        }
      },
      include: {
        account: true,
        bookmarkable: true
      }
    });
    const type = bookmarkable.type;

    await this.bookmarkCacheService.createBookmark(account.id, result.id, bookmarkableId, type, result.createdAt);

    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Bookmark)
  async removeBookmark(@AccountEntity() account: Account, @Args('data') data: RemoveBookmarkInput) {
    if (!account || account.id !== data.accountId) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { bookmarkId, accountId } = data;

    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
        account: {
          id: accountId
        }
      },
      include: {
        bookmarkable: true
      }
    });

    if (!bookmark) {
      const bookmarkNotFound = 'Bookmark not found';
      throw new Error(bookmarkNotFound);
    }

    const result = await this.prisma.bookmark.delete({
      where: {
        id: bookmark.id,
        account: {
          id: accountId
        }
      },
      include: {
        account: true
      }
    });

    const { bookmarkable } = bookmark;
    const type = bookmarkable.type;

    await this.bookmarkCacheService.removeBookmark(
      accountId,
      bookmarkId,
      bookmark.bookmarkableId,
      bookmark.bookmarkable.type!
    );

    return result;
  }
}
