import {
  Account,
  Category,
  CreatePageInput,
  Page,
  PageConnection,
  PageOrder,
  PaginationArgs,
  UpdatePageInput,
  DEFAULT_CATEGORY
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
import { aesGcmEncrypt, generateRandomBase58Str } from '../../utils/encryptionMethods';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PageCacheService } from './page-cache.service';
import { FollowCacheService } from '../account/follow-cache.service';
import { ImageUploadableType } from '@bcpros/lixi-prisma';

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
    const page = await this.prisma.page.findFirst({
      where: { id: id },
      include: {
        pageAccount: true,
        category: true,
        country: true,
        state: true
      }
    });

    // TODO: Shorten query
    const followersCount = await this.prisma.followPage.count({
      where: { pageId: id }
    });

    const result = {
      ...page,
      followersCount: followersCount,
      totalBurnForPage: page ? page.danaBurnScore + page.totalPostsBurnScore : 0,
      categoryId: page?.categoryId ?? DEFAULT_CATEGORY,
      countryName: page?.country?.name ?? undefined,
      stateName: page?.state?.name ?? undefined
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
            include: {
              pageAccount: true
            },
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
    const result = await findManyCursorConnection(
      async args => {
        const pages = await this.prisma.page.findMany({
          where: {
            pageAccountId: id
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        });

        const output = pages.map(page => ({
          ...page,
          categoryId: page?.categoryId ?? DEFAULT_CATEGORY,
          totalBurnForPage: page.danaBurnScore + page.totalPostsBurnScore ?? 0
        }));

        return output;
      },
      () =>
        this.prisma.page.count({
          where: {
            pageAccountId: _.toSafeInteger(id)
          }
        }),
      { first, last, before, after }
    );
    return result;
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
      },
      include: {
        pageAccount: true
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

    const { avatar: avatarId, cover: coverId, id: pageId } = data;

    /*Page Avatar*/
    if (avatarId) {
      await this.prisma.$transaction(async prisma => {
        //find page avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                pageAvatar: {
                  id: pageId
                }
              }
            ]
          }
        });

        if (!result) {
          //if not found, create new one and connect to account, page and uploads
          const imageUploadable = await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: account.id
                }
              },
              uploads: {
                connect: {
                  id: avatarId
                }
              },
              pageAvatar: {
                connect: {
                  id: pageId
                }
              },
              type: ImageUploadableType.PAGE_AVATAR
            }
          });

          return imageUploadable;
        } else {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: avatarId
                }
              }
            }
          });

          return result;
        }
      });
    }

    /*Page Cover*/
    if (coverId) {
      await this.prisma.$transaction(async prisma => {
        //find page avatar image uploadable
        const result = await prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                account: {
                  id: account.id
                }
              },
              {
                pageCover: {
                  id: coverId
                }
              }
            ]
          }
        });

        if (!result) {
          //if not found, create new one and connect to account, page and uploads
          const imageUploadable = await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: account.id
                }
              },
              uploads: {
                connect: {
                  id: coverId
                }
              },
              pageCover: {
                connect: {
                  id: pageId
                }
              },
              type: ImageUploadableType.PAGE_COVER
            }
          });

          return imageUploadable;
        } else {
          //if found, disconnect all uploads and connect new one
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                set: []
              }
            }
          });

          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: {
                  id: coverId
                }
              }
            }
          });

          return result;
        }
      });
    }

    const updatedPage = await this.prisma.page.update({
      where: {
        id: data.id
      },
      data: {
        ..._.omit(data, ['categoryId', 'countryId', 'stateId', 'parentId', 'avatar', 'cover']),
        description: data.description?.trim() ?? '',
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
      },
      include: {
        pageAccount: true
      }
    });

    pubSub.publish('pageUpdated', { pageUpdated: updatedPage });
    return updatedPage;
  }
}
