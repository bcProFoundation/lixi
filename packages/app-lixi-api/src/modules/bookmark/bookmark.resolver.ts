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

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Bookmark)
@UseFilters(GqlHttpExceptionFilter)
export class BookmarkResolver {
  constructor(private logger: Logger, private prisma: PrismaService, @I18n() private i18n: I18nService) {}

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
    @Args({ name: 'id', type: () => Number })
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

    const result = await this.prisma.bookmark.create({
      data: {
        account: {
          connect: {
            id: account.id
          }
        },
        bookmarkId: bookmarkId,
        type: bookmarkType
      }
    });

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

    const result = await this.prisma.bookmark.delete({
      where: {
        id: id
      }
    });

    return result;
  }
}
