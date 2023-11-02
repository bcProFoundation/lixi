import {
  Account,
  BasicPaginationArgs,
  CreatePageInput,
  DEFAULT_CATEGORY,
  IBasicPaginated,
  Page,
  PageBasicConnection,
  PageConnection,
  PageDana,
  PageOrder,
  PaginationArgs,
  UpdatePageInput
} from '@bcpros/lixi-models';
import BCHJS from '@bcpros/xpi-js';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Inject, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { PageAccountEntity } from 'src/decorators/pageAccount.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { createEdge } from '../../common/custom-graphql-relay/paginate';
import { aesGcmEncrypt, generateRandomBase58Str } from '../../utils/encryptionMethods';
import { FollowCacheService } from '../account/follow-cache.service';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PageCacheService } from './page-cache.service';
import { PageTimelineCacheService } from './page-timeline-cache.service';
import PageLoader from './page.loader';
import { toImageUrl } from './page.utils';

@SkipThrottle()
@Resolver(() => Page)
@UseFilters(GqlHttpExceptionFilter)
export class PageResolver {
  static pubSub = new PubSub();
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pageLoader: PageLoader,
    private readonly pageCacheService: PageCacheService,
    private readonly followCacheService: FollowCacheService,
    private readonly pageTimelineCacheService: PageTimelineCacheService,
    @I18n() private i18n: I18nService,
    @Inject('xpijs') private XPI: BCHJS
  ) { }

  @Subscription(() => Page)
  static pageCreated() {
    return PageResolver.pubSub.asyncIterator('pageCreated');
  }

  @Query(() => Page)
  async page(@PageAccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    return await this.pageCacheService.getById(id);
  }

  @Query(() => PageBasicConnection)
  @UseGuards(GqlJwtAuthGuard)
  async pagesByFollower(
    @PageAccountEntity() account: Account,
    @Args() { after, first = 20 }: BasicPaginationArgs
  ) {
    if (!account) {
      const accountNotExist = await this.i18n.t('account.messages.accountNotExist');
      throw Error(accountNotExist);
    }

    const paginated = await this.followCacheService.getPaginatedPageFollowings(account.id, first, after);
    const pageIds = paginated.edges.map(item => item.cursor);
    const pages = await this.pageCacheService.getByIds(pageIds);
    return {
      ...paginated,
      edges: pages.map(page => (page ? createEdge<Page>(page, 'id') : null))
    } as IBasicPaginated<Page>;
  }

  @Query(() => PageBasicConnection)
  async allPages(@Args() { after, before, first = 20, last }: PaginationArgs) {
    const paginated = await this.pageTimelineCacheService.getPaginatedPageTimeline(first, after);
    const pageIds = paginated.edges.map(item => item.cursor);
    const pages = await this.pageCacheService.getByIds(pageIds);
    return {
      ...paginated,
      edges: pages.map(page => (page ? createEdge<Page>(page, 'id') : null))
    } as IBasicPaginated<Page>;
  }

  @Query(() => PageBasicConnection)
  async allPagesByUserId(
    @Args() { after, first = 20 }: BasicPaginationArgs,
    @Args({ name: 'id', type: () => Number, nullable: true })
    id: number
  ) {
    const paginated = await this.pageTimelineCacheService.getPaginatedPageTimelineByUser(id, first, after);
    const pageIds = paginated.edges.map(item => item.cursor);
    const pages = await this.pageCacheService.getByIds(pageIds);
    return {
      ...paginated,
      edges: pages.map(page => (page ? createEdge<Page>(page, 'id') : null))
    } as IBasicPaginated<Page>;
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

    const page = await this.pageCacheService.getById(createdPage.id);
    if (page) {
      await this.pageTimelineCacheService.cachePage(page);
    }
    PageResolver.pubSub.publish('pageCreated', { pageCreated: page });
    return page;
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

    const page = await this.pageCacheService.getById(updatedPage.id);

    PageResolver.pubSub.publish('pageUpdated', { pageUpdated: page });
    return page;
  }

  @ResolveField('followersCount', () => Number)
  async followersCount(@Parent() page: Page) {
    return this.pageLoader.batchFollowersCount.load(page.id);
  }

  @ResolveField('pageDana', () => PageDana)
  async pageDana(@Parent() page: Page) {
    return this.pageLoader.batchPageDanas.load(page.id);
  }
}
