import {
  Account,
  CreatePageInput,
  DEFAULT_CATEGORY,
  Page,
  PageConnection,
  PageOrder,
  PaginationArgs,
  UpdatePageInput
} from '@bcpros/lixi-models';
import BCHJS from '@bcpros/xpi-js';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Inject, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PageAccountEntity } from 'src/decorators/pageAccount.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { aesGcmEncrypt, generateRandomBase58Str } from '../../utils/encryptionMethods';
import { FollowCacheService } from '../account/follow-cache.service';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PageCacheService } from './page-cache.service';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Page)
@UseFilters(GqlHttpExceptionFilter)
export class PageResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pageCacheService: PageCacheService,
    private readonly followCacheService: FollowCacheService,
    @I18n() private i18n: I18nService,
    @Inject('xpijs') private XPI: BCHJS
  ) {}

  @Subscription(() => Page)
  pageCreated() {
    return pubSub.asyncIterator('pageCreated');
  }

  @Query(() => Page)
  async page(@PageAccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    const page: Page = (await this.pageCacheService.getById(id)) as Page;

    if (!page) return page;

    const followersCount = await this.followCacheService.getPageFollowersCount(page.id);

    const result: Page = {
      ...page,
      followersCount: followersCount,
      totalBurnForPage: page ? page.danaBurnScore + page.totalPostsBurnScore : 0
    };

    return result;
  }

  @Query(() => PageConnection)
  async allPages(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    query: string,
    @Args({
      name: 'orderBy',
      type: () => [PageOrder!],
      nullable: true
    })
    orderBy: PageOrder[]
  ) {
    const result = await findManyCursorConnection(
      async args => {
        const pages = await this.prisma.page
          .findMany({
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          })
          .then(pages =>
            pages
              .map(page => ({
                ...page,
                totalBurnForPage: page.danaBurnScore + page.totalPostsBurnScore ?? 0,
                categoryId: page?.categoryId ?? DEFAULT_CATEGORY
              }))
              .sort((a, b) => b.totalBurnForPage - a.totalBurnForPage)
          );

        return pages;
      },
      () => this.prisma.page.count(),
      { first, last, before, after }
    );
    return result;
  }

  @Query(() => PageConnection)
  async allPagesByUserId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => Number, nullable: true })
    id: number,
    @Args({
      name: 'orderBy',
      type: () => PageOrder,
      nullable: true
    })
    orderBy: PageOrder
  ) {
    const cursor = after;
    const size = first;
    if (!size) throw new Error('Invalid arguments');

    const pagesData = await this.pageCacheService.getByUserId(id, size, cursor);

    return pagesData;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Page)
  async createPage(@PageAccountEntity() account: Account, @Args('data') data: CreatePageInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      const error = new VError.WError(couldNotFindAccount);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const lang = 'english';
    const Bip39128BitMnemonic = this.XPI.Mnemonic.generate(128, this.XPI.Mnemonic.wordLists()[lang]);
    const salt = generateRandomBase58Str(10);

    const encryptedMnemonic: string = await aesGcmEncrypt(Bip39128BitMnemonic, salt + process.env.MNEMONIC_SECRET);

    const createdPage = await this.prisma.page.create({
      data: {
        ..._.omit(data, ['categoryId']),
        pageAccount: { connect: { id: account.id } },
        category: {
          connect: {
            id: Number(data.categoryId) ?? DEFAULT_CATEGORY
          }
        },
        salt: salt,
        encryptedMnemonic: encryptedMnemonic
      }
    });

    pubSub.publish('pageCreated', { pageCreated: createdPage });
    return createdPage;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Page)
  async updatePage(@PageAccountEntity() account: Account, @Args('data') data: UpdatePageInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }

    const uploadAvatarDetail = data.avatar
      ? await this.prisma.uploadDetail.findFirst({
          where: {
            uploadId: data.avatar
          }
        })
      : undefined;

    const uploadCoverDetail = data.cover
      ? await this.prisma.uploadDetail.findFirst({
          where: {
            uploadId: data.cover
          }
        })
      : undefined;

    const updatedPage = await this.prisma.page.update({
      where: {
        id: data.id
      },
      data: {
        ..._.omit(data, ['categoryId', 'countryId', 'stateId', 'parentId', 'avatar', 'cover']),
        description: data.description?.trim() ?? '',
        avatar: { connect: uploadAvatarDetail ? { id: uploadAvatarDetail.id } : undefined },
        cover: { connect: uploadCoverDetail ? { id: uploadCoverDetail.id } : undefined },
        category: {
          connect: data.categoryId
            ? {
                id: Number(data.categoryId)
              }
            : undefined
        },
        country: {
          connect: data.countryId
            ? {
                id: Number(data.countryId)
              }
            : undefined
        },
        state: {
          disconnect: !data.stateId,
          connect: data.stateId
            ? {
                id: Number(data.stateId)
              }
            : undefined
        }
      }
    });

    pubSub.publish('pageUpdated', { pageUpdated: updatedPage });
    return updatedPage;
  }
}
