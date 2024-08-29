import {
  Account,
  COIN,
  CreatePostInput,
  ICommentableTo,
  IImageUploadableTo,
  ImageUploadable as ImageUploadableModel,
  Offer,
  Page,
  PaginationArgs,
  Poll,
  Post,
  PostBoost,
  PostConnection,
  PostDana,
  PostOrder,
  PostTranslation,
  RemovePostInput,
  Repost,
  RepostInput,
  Token,
  UpdatePostInput
} from '@bcpros/lixi-models';
import {
  CommentType,
  ImageUploadable,
  ImageUploadableType,
  NotificationLevel,
  Post as PostPrisma
} from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpException, HttpStatus, Inject, Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import { ChronikClient, ChronikClientNode } from 'chronik-client';
import { PubSub } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient, InjectChronikClientNode } from 'nestjs-chronik';
import { NOTIFICATION_TYPES } from 'src/common/modules/notifications/notification.constants';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { connectionFromArraySlice } from '../../common/custom-graphql-relay/arrayConnection';
import ConnectionArgs, { getPagingParameters } from '../../common/custom-graphql-relay/connection.args';
import { AccountCacheService } from '../account/account-cache.service';
import { FollowCacheService } from '../account/follow-cache.service';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { HashtagService } from '../hashtag/hashtag.service';
import { PrismaService } from '../prisma/prisma.service';
import { XPIJS } from '../wallet/wallet.constants';
import CommentableLoader from './commentable.loader';
import { CONTENT_FANOUT_QUEUE, REMOVE_POST_FANOUT_QUEUE } from './constants';
import { HASHTAG, POSTS } from './constants/meili.constants';
import ImageUploadableLoader from './imageUploadable.loader';
import { MeiliService } from './meili.service';
import PostLoader from './post.loader';
import { PostCacheService } from './post-cache.service';
import TimelineableLoader from './timelineable.loader';
import BookmarkLoader from '../bookmark/bookmark.loader';

const pubSub = new PubSub();

@Injectable()
@Resolver(() => Post)
@UseFilters(GqlHttpExceptionFilter)
export class PostResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly postCacheService: PostCacheService,
    private readonly followCacheService: FollowCacheService,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @InjectRedis() private readonly redis: Redis,
    private readonly notificationService: NotificationService,
    private hashtagService: HashtagService,
    @InjectQueue(CONTENT_FANOUT_QUEUE) private postFanoutQueue: Queue,
    @InjectQueue(REMOVE_POST_FANOUT_QUEUE) private removePostFanoutQueue: Queue,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClientNode('xec') private chronikXEC: ChronikClientNode,
    @InjectChronikClient('xrg') private chronikXRG: ChronikClient,
    @I18n() private i18n: I18nService,
    private readonly accountCacheService: AccountCacheService,
    private readonly postLoader: PostLoader,
    private readonly commentableLoader: CommentableLoader,
    private readonly imageUploadableLoader: ImageUploadableLoader,
    private readonly timelineableLoader: TimelineableLoader,
    private readonly bookmarkLoader: BookmarkLoader
  ) {}

  @SkipThrottle()
  @Query(() => Post)
  @UseGuards(GqlJwtAuthGuardByPass)
  async post(@Args('id', { type: () => String }) id: string) {
    return await this.postCacheService.getById(id);
  }

  @SkipThrottle()
  @Query(() => PostConnection)
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsByPageId(
    @AccountEntity() account: Account,
    @Args() { after, before, first, last, minBurnFilter }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string,
    @Args({ name: 'accountId', type: () => Number, nullable: true })
    accountId: number,
    @Args({
      name: 'orderBy',
      type: () => [PostOrder!],
      nullable: true
    })
    orderBy: PostOrder[]
  ) {
    let result;
    const page = await this.prisma.page.findFirst({
      where: {
        id: id
      }
    });

    if (!account) {
      result = await findManyCursorConnection(
        args =>
          this.prisma.post.findMany({
            include: {
              account: true,
              reposts: { select: { account: true, accountId: true } },
              translations: true
            },
            where: {
              OR: [
                {
                  pageId: id
                },
                {
                  AND: [{ pageId: id }, { danaBurnScore: { gte: minBurnFilter ?? 0 } }]
                }
              ]
            },
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          }),
        () =>
          this.prisma.post.count({
            where: {
              OR: [
                {
                  pageId: id
                },
                {
                  AND: [{ pageId: id }, { danaBurnScore: { gte: minBurnFilter ?? 0 } }]
                }
              ]
            }
          }),
        { first, last, before, after }
      );

      return result;
    }

    if (account?.id === page?.pageAccountId) {
      result = await findManyCursorConnection(
        async args => {
          const posts = await this.prisma.post.findMany({
            include: {
              account: true,
              reposts: { select: { account: true, accountId: true } },
              translations: true,
              page: true
            },
            where: {
              OR: [
                {
                  AND: [{ accountId: accountId }, { pageId: id }]
                },
                {
                  AND: [{ pageId: id }]
                }
              ]
            },
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          });

          const result = await Promise.all(
            posts.map(async post => ({
              ...post,
              repostCount: await this.prisma.repost.count({
                where: { postId: post.id }
              })
            }))
          );

          return result;
        },
        () =>
          this.prisma.post.count({
            where: {
              OR: [
                {
                  AND: [{ accountId: accountId }, { pageId: id }]
                },
                {
                  AND: [{ pageId: id }, { danaBurnScore: { gte: minBurnFilter ?? 0 } }]
                }
              ]
            }
          }),
        { first, last, before, after }
      );
    } else if (account) {
      result = await findManyCursorConnection(
        args =>
          this.prisma.post.findMany({
            include: {
              account: true,
              reposts: { select: { account: true, accountId: true } },
              translations: true,
              page: true
            },
            where: {
              OR: [
                {
                  AND: [{ accountId: accountId }, { pageId: id }]
                },
                {
                  AND: [{ pageId: id }, { danaBurnScore: { gte: minBurnFilter ?? 0 } }]
                }
              ]
            },
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          }),
        () =>
          this.prisma.post.count({
            where: {
              OR: [
                {
                  AND: [{ accountId: accountId }, { pageId: id }]
                },
                {
                  AND: [{ pageId: id }, { danaBurnScore: { gte: minBurnFilter ?? 0 } }]
                }
              ]
            }
          }),
        { first, last, before, after }
      );
    }

    return result;
  }

  @SkipThrottle()
  @Query(() => PostConnection, { name: 'allPostsBySearch' })
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsBySearch(
    @Args() args: ConnectionArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    @Args({ name: 'minBurnFilter', type: () => Int, nullable: true })
    query: string
  ) {
    const { limit, offset } = getPagingParameters(args);

    const count = await this.meiliService.searchByQueryEstimatedTotalHits(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query
    );

    const posts = await this.meiliService.searchByQueryHits(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query,
      offset!,
      limit!
    );

    const postsId = _.map(posts, 'id');

    const searchPosts = await this.prisma.post.findMany({
      where: {
        id: { in: postsId }
      },
      include: {
        uploads: true,
        account: true,
        page: true,
        translations: true,
        dana: true,
        reposts: { select: { account: true, accountId: true } },
        _count: {
          select: { reposts: true }
        }
      }
    });

    return connectionFromArraySlice(searchPosts, args, {
      arrayLength: count || 0,
      sliceStart: offset || 0
    });
  }

  @SkipThrottle()
  @Query(() => PostConnection, { name: 'allPostsBySearchWithHashtag' })
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsBySearchWithHashtag(
    @Args({ name: 'minBurnFilter', type: () => Int, nullable: true })
    minBurnFilter: number,
    @Args()
    args: ConnectionArgs,
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    query: string,
    @Args({ name: 'hashtags', type: () => [String], nullable: true })
    hashtags: string[],
    @Args({
      name: 'orderBy',
      type: () => PostOrder,
      nullable: true
    })
    orderBy: PostOrder
  ) {
    try {
      const { limit, offset } = getPagingParameters(args);

      const posts = await this.hashtagService.searchByQueryHits(
        `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
        query,
        hashtags,
        offset!,
        limit!
      );

      const postsId = _.map(posts, 'id');

      const result = await findManyCursorConnection(
        args =>
          this.prisma.post.findMany({
            include: {
              uploads: true,
              account: true,
              page: true,
              translations: true,
              dana: true,
              reposts: { select: { account: true, accountId: true } },
              _count: {
                select: { reposts: true }
              }
            },
            where: {
              AND: [
                {
                  id: { in: postsId }
                },
                {
                  danaBurnScore: {
                    gte: minBurnFilter ?? 0
                  }
                }
              ]
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args
          }),
        () =>
          this.prisma.post.count({
            where: {
              AND: [
                {
                  id: { in: postsId }
                },
                {
                  danaBurnScore: {
                    gte: minBurnFilter ?? 0
                  }
                }
              ]
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined
          }),
        { first, last, before, after }
      );
      return result;
    } catch (err) {
      this.logger.error(err);
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @SkipThrottle()
  @Query(() => PostConnection, { name: 'allPostsBySearchWithHashtagAtPage' })
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsBySearchWithHashtagAtPage(
    @Args({ name: 'minBurnFilter', type: () => Int, nullable: true })
    minBurnFilter: number,
    @Args()
    args: ConnectionArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    query: string,
    @Args({ name: 'hashtags', type: () => [String], nullable: true })
    hashtags: string[],
    @Args({ name: 'pageId', type: () => String, nullable: true })
    pageId: string,
    @Args({
      name: 'orderBy',
      type: () => PostOrder,
      nullable: true
    })
    orderBy: PostOrder
  ) {
    const { limit, offset } = getPagingParameters(args);

    const count = await this.hashtagService.searchByQueryEstimatedTotalHitsAtPage(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query,
      hashtags,
      pageId
    );

    const posts = await this.hashtagService.searchByQueryHitsAtPage(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query,
      hashtags,
      pageId,
      offset!,
      limit!
    );

    const postsId = _.map(posts, 'id');

    const searchPosts = await this.prisma.post.findMany({
      include: {
        uploads: true,
        account: true,
        page: true,
        translations: true,
        dana: true,
        reposts: { select: { account: true, accountId: true } },
        _count: {
          select: { reposts: true }
        }
      },
      where: {
        AND: [
          {
            id: { in: postsId }
          },
          {
            danaBurnScore: {
              gte: minBurnFilter ?? 0
            }
          }
        ]
      },
      orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined
    });

    return connectionFromArraySlice(searchPosts, args, {
      arrayLength: count || 0,
      sliceStart: offset || 0
    });
  }

  @SkipThrottle()
  @Query(() => PostConnection, { name: 'allPostsBySearchWithHashtagAtToken' })
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsBySearchWithHashtagAtToken(
    @Args({ name: 'minBurnFilter', type: () => Int, nullable: true })
    minBurnFilter: number,
    @Args()
    args: ConnectionArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    query: string,
    @Args({ name: 'hashtags', type: () => [String], nullable: true })
    hashtags: string[],
    @Args({ name: 'tokenId', type: () => String, nullable: true })
    tokenId: string,
    @Args({
      name: 'orderBy',
      type: () => PostOrder,
      nullable: true
    })
    orderBy: PostOrder
  ) {
    const { limit, offset } = getPagingParameters(args);

    const count = await this.hashtagService.searchByQueryEstimatedTotalHitsAtToken(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query,
      hashtags,
      tokenId
    );

    const posts = await this.hashtagService.searchByQueryHitsAtToken(
      `${process.env.MEILISEARCH_BUCKET}_${POSTS}`,
      query,
      hashtags,
      tokenId,
      offset!,
      limit!
    );

    const postsId = _.map(posts, 'id');

    const searchPosts = await this.prisma.post.findMany({
      include: {
        uploads: true,
        account: true,
        page: true,
        translations: true,
        dana: true,
        reposts: { select: { account: true, accountId: true } },
        _count: {
          select: { reposts: true }
        }
      },
      where: {
        AND: [
          {
            id: { in: postsId }
          },
          {
            danaBurnScore: {
              gte: minBurnFilter ?? 0
            }
          }
        ]
      },
      orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined
    });

    return connectionFromArraySlice(searchPosts, args, {
      arrayLength: count || 0,
      sliceStart: offset || 0
    });
  }

  @SkipThrottle()
  @Query(() => PostConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allPostsByTokenId(
    @AccountEntity() account: Account,
    @Args() { after, before, first, last, minBurnFilter }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string,
    @Args({
      name: 'orderBy',
      type: () => PostOrder,
      nullable: true
    })
    orderBy: PostOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.post.findMany({
          include: { account: true, translations: true, token: true },
          where: {
            OR: [
              {
                AND: [{ accountId: account.id }, { tokenId: id }]
              },
              {
                AND: [
                  {
                    tokenId: id
                  },
                  {
                    danaBurnScore: {
                      gte: minBurnFilter ?? 0
                    }
                  }
                ]
              }
            ]
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.post.count({
          where: {
            OR: [
              {
                AND: [{ accountId: account.id }, { tokenId: id }]
              },
              {
                AND: [
                  {
                    tokenId: id
                  },
                  {
                    danaBurnScore: {
                      gte: minBurnFilter ?? 0
                    }
                  }
                ]
              }
            ]
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @SkipThrottle()
  @Query(() => PostConnection)
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsByUserId(
    @AccountEntity() account: Account,
    @Args() { after, before, first, last, minBurnFilter }: PaginationArgs,
    @Args({ name: 'id', type: () => Number, nullable: true })
    id: number,
    @Args({
      name: 'orderBy',
      type: () => [PostOrder!],
      nullable: true
    })
    orderBy: PostOrder[]
  ) {
    let result;
    if (account?.id === _.toSafeInteger(id)) {
      result = await findManyCursorConnection(
        args =>
          this.prisma.post.findMany({
            include: { account: true, translations: true },
            where: {
              AND: [
                {
                  accountId: _.toSafeInteger(id)
                }
              ]
            },
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          }),
        () =>
          this.prisma.post.count({
            where: {
              AND: [
                {
                  accountId: _.toSafeInteger(id)
                }
              ]
            }
          }),
        { first, last, before, after }
      );
    } else {
      result = await findManyCursorConnection(
        args =>
          this.prisma.post.findMany({
            include: { account: true, page: false, token: false, translations: true },
            where: {
              AND: [
                {
                  accountId: _.toSafeInteger(id)
                },
                {
                  danaBurnScore: {
                    gte: minBurnFilter ?? 0
                  }
                }
              ]
            },
            orderBy: orderBy ? orderBy.map(item => ({ [item.field]: item.direction })) : undefined,
            ...args
          }),
        () =>
          this.prisma.post.count({
            where: {
              AND: [
                {
                  accountId: _.toSafeInteger(id)
                },
                {
                  danaBurnScore: {
                    gte: minBurnFilter ?? 0
                  }
                }
              ]
            }
          }),
        { first, last, before, after }
      );
    }
    return result;
  }

  @SkipThrottle()
  @Query(() => PostConnection)
  @UseGuards(GqlJwtAuthGuardByPass)
  async allPostsByHashtagId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    hashtagId: string,
    @Args({
      name: 'orderBy',
      type: () => PostOrder,
      nullable: true
    })
    orderBy: PostOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.post.findMany({
          include: { account: true, postHashtags: true, translations: true, dana: true },
          where: {
            postHashtags: {
              some: {
                hashtagId: hashtagId
              }
            }
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.post.count({
          where: {
            postHashtags: {
              some: {
                hashtagId: hashtagId
              }
            }
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async createPost(@AccountEntity() account: Account, @Args('data') data: CreatePostInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { uploads, pageId, htmlContent, tokenPrimaryId, pureContent, coinFee, createFeeHex } = data;
    let imageUploadable: ImageUploadable | null = null;

    //find existing imageUploadable
    if (uploads && uploads.length > 0) {
      imageUploadable = await this.prisma.imageUploadable.findFirst({
        where: {
          AND: [
            {
              accountId: account.id
            },
            {
              uploads: {
                every: {
                  id: {
                    in: uploads
                  }
                }
              }
            }
          ]
        }
      });
    }

    const postToSave = {
      content: htmlContent,
      account: { connect: { id: account.id } },
      page: {
        connect: pageId ? { id: pageId } : undefined
      },
      token: {
        connect: tokenPrimaryId ? { id: tokenPrimaryId } : undefined
      },
      imageUploadable: {
        connect: imageUploadable ? { id: imageUploadable.id } : undefined
      }
    };

    let createFee: any;

    const savedPost = await this.prisma.$transaction(
      async prisma => {
        let txid: string | undefined;
        let broadcastResponse;
        if (createFeeHex) {
          switch (coinFee) {
            case COIN.XPI:
              broadcastResponse = await this.chronikXPI.broadcastTx(createFeeHex);
              break;
            case COIN.XEC:
              broadcastResponse = await this.chronikXEC.broadcastTx(createFeeHex);
              break;
            case COIN.XRG:
              broadcastResponse = await this.chronikXRG.broadcastTx(createFeeHex);
              break;
            default:
              broadcastResponse = await this.chronikXPI.broadcastTx(createFeeHex);
              break;
          }
          if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
          }
          txid = broadcastResponse.txid;
        }

        const createdPost = await prisma.post.create({
          data: {
            ...postToSave,
            commentable: {
              create: {
                type: CommentType.POST
              }
            },
            txid: txid,
            createFee: createFee,
            dana: {
              create: {}
            },
            taggable: {
              create: {}
            }
          },
          include: {
            page: {
              select: {
                id: true,
                address: true,
                name: true
              }
            },
            token: {
              select: {
                id: true,
                name: true
              }
            },
            account: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        });

        if (imageUploadable) {
          await prisma.imageUploadable.update({
            where: {
              id: imageUploadable?.id
            },
            data: {
              type: ImageUploadableType.POST
            }
          });
        }

        return createdPost;
      },
      { timeout: 10000 }
    );

    //Hashtag
    const hashtags = await this.hashtagService.extractAndSave(
      `${process.env.MEILISEARCH_BUCKET}_${HASHTAG}`,
      pureContent,
      savedPost.id
    );

    const indexedPost = {
      id: savedPost.id,
      content: pureContent,
      accountName: savedPost.account.name,
      createdAt: savedPost.createdAt,
      updatedAt: savedPost.updatedAt,
      page: {
        id: savedPost.page?.id,
        name: savedPost.page?.name
      },
      token: {
        id: savedPost.token?.id,
        name: savedPost.token?.name
      },
      hashtag: hashtags
    };

    await this.meiliService.add(`${process.env.MEILISEARCH_BUCKET}_${POSTS}`, indexedPost, savedPost.id);

    pubSub.publish('postCreated', { postCreated: savedPost });
    let listAccountFollowerIds: number[] = [];
    // Notification
    if (pageId && savedPost) {
      const page = await this.prisma.page.findFirst({
        where: {
          id: pageId
        }
      });

      if (!page) {
        const accountNotExistMessage = await this.i18n.t('page.messages.couldNotFindPage');
        throw new VError(accountNotExistMessage);
      }

      const recipient = await this.accountCacheService.getById(page.pageAccountId);
      if (!recipient) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const createNotif = {
        senderId: account.id,
        recipientId: Number(page?.pageAccountId),
        notificationTypeId: NOTIFICATION_TYPES.POST_ON_PAGE,
        level: NotificationLevel.INFO,
        url: `/post/${savedPost.id}`,
        additionalData: {
          senderName: account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar,
          pageName: savedPost?.page?.name
        }
      };
      const jobData = {
        notification: createNotif
      };
      createNotif.senderId !== createNotif.recipientId &&
        (await this.notificationService.saveAndDispatchNotification(jobData.notification));

      // collect account id follow page
      const followerPageIds = await this.followCacheService.getPageFollowers(page.id);
      if (followerPageIds && followerPageIds.length > 0) {
        const followerPageIdsMapped = followerPageIds.map(id => Number(id));
        listAccountFollowerIds = listAccountFollowerIds.concat(followerPageIdsMapped);
      }
    }
    // collect account id follow this account
    const followerAccountIds = await this.followCacheService.getAccountFollowers(account.id);
    if (followerAccountIds && followerAccountIds.length > 0) {
      const followerAccountIdsMapped = followerAccountIds.map(id => Number(id));
      listAccountFollowerIds = listAccountFollowerIds.concat(followerAccountIdsMapped);
    }
    if (listAccountFollowerIds && listAccountFollowerIds.length > 0) {
      // filter account duplicate
      listAccountFollowerIds = listAccountFollowerIds.filter(
        (value, index) => listAccountFollowerIds.indexOf(value) === index
      );
      // filter out main account of follower list
      listAccountFollowerIds = listAccountFollowerIds.filter(id => id !== account.id);
      const followerDetails = await this.prisma.account.findMany({
        where: { id: { in: listAccountFollowerIds } },
        select: { address: true }
      });
      if (followerDetails && followerDetails.length > 0) {
        const addressFollowerAccountDetails = followerDetails.map(item => item.address);
        const createNotiNewPost = {
          recipientAddresses: addressFollowerAccountDetails
        };
        await this.notificationService.saveAnddDispathNotificationNewPost(createNotiNewPost);
      }
    }

    // Fanout the post created
    await this.postFanoutQueue.add(CONTENT_FANOUT_QUEUE, { post: savedPost });

    return savedPost;
  }

  @SkipThrottle()
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async updatePost(@AccountEntity() account: Account, @Args('data') data: UpdatePostInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { id, htmlContent, pureContent } = data;

    const post = await this.prisma.post.findUnique({
      where: {
        id: id
      },
      include: {
        account: {
          select: {
            address: true
          }
        }
      }
    });

    if (post?.account.address !== account.address) {
      const noPermissionToUpdate = await this.i18n.t('post.messages.noPermissionToUpdate');
      throw new Error(noPermissionToUpdate);
    }

    if (post?.danaBurnScore !== 0) {
      const noPermissionToUpdate = await this.i18n.t('post.messages.noPermissionToUpdate');
      throw new Error(noPermissionToUpdate);
    }

    //Hashtag
    const hashtags = await this.hashtagService.extractAndSave(
      `${process.env.MEILISEARCH_BUCKET}_${HASHTAG}`,
      pureContent,
      post.id
    );

    const updatedPost = await this.prisma.post.update({
      where: {
        id: id
      },
      data: {
        content: htmlContent,
        updatedAt: new Date()
      }
    });

    const indexedPost = {
      id: updatedPost.id,
      content: pureContent,
      updatedAt: updatedPost.updatedAt,
      hashtag: hashtags
    };

    // Clear the post from cache
    const hashPrefix = `items:posts:item-data`;
    await this.redis.hdel(hashPrefix, id);

    await this.meiliService.update(`${process.env.MEILISEARCH_BUCKET}_${POSTS}`, indexedPost, updatedPost.id);

    pubSub.publish('postUpdated', { postUpdated: updatedPost });
    return updatedPost;
  }

  @SkipThrottle()
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  async repost(@AccountEntity() account: Account, @Args('data') data: RepostInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    if (account.id !== data.accountId) {
      const noPermission = await this.i18n.t('account.messages.noPermission');
      throw new Error(noPermission);
    }

    let repostFee: any;

    const reposted = await this.prisma.$transaction(async prisma => {
      let txid = null;
      if (data.txHex) {
        const broadcastResponse = await this.chronikXPI.broadcastTx(data.txHex).catch(async () => {
          throw new Error('Empty chronik broadcast response');
        });
        txid = broadcastResponse.txid;
      }

      const updatePost = await prisma.post.update({
        where: { id: data.postId },

        data: {
          lastRepostAt: new Date(),
          reposts: {
            create: {
              accountId: account.id,
              repostFee: repostFee,
              txid: txid
            }
          }
        }
      });

      return updatePost;
    });

    await Promise.all([
      this.postLoader.batchReposts.clear(data.postId),
      this.postLoader.batchRepostCount.clear(data.postId)
    ]);

    return reposted ? true : false;
  }

  @SkipThrottle()
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async removePost(@AccountEntity() account: Account, @Args('data') data: RemovePostInput) {
    try {
      const { accountId, postId } = data;
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      if (account.id !== accountId) {
        const noPermission = await this.i18n.t('account.messages.noPermission');
        throw new Error(noPermission);
      }

      //remove post
      const removedPost = await this.prisma.$transaction(async prisma => {
        const postRemoved = await prisma.post.delete({
          where: {
            id: postId
          }
        });
        const { bookmarkableId, imageUploadableId, commentableId } = postRemoved;

        if (imageUploadableId) {
          await prisma.imageUploadable.delete({
            where: { id: imageUploadableId }
          });
        }

        if (bookmarkableId) {
          await prisma.bookmarkable.delete({
            where: { id: bookmarkableId }
          });
        }

        if (commentableId) {
          await prisma.commentable.delete({
            where: { id: commentableId }
          });
        }

        return postRemoved;
      });

      // Fanout the post removed
      await this.removePostFanoutQueue.add(REMOVE_POST_FANOUT_QUEUE, { post: removedPost });

      return removedPost;
    } catch (error) {
      this.logger.error(error);
    }
  }
  @ResolveField('reposts', () => Repost)
  async reposts(@Parent() post: Post) {
    return this.postLoader.batchReposts.load(post.id);
  }

  @ResolveField('repostCount', () => Number)
  async repostCount(@Parent() post: Post) {
    return this.postLoader.batchRepostCount.load(post.id);
  }

  @ResolveField('account', () => Account)
  async postAccount(@Parent() post: Post) {
    return post.accountId ? this.postLoader.batchAccounts.load(post.accountId) : null;
  }

  @ResolveField('totalComments', () => Number)
  async totalComments(@Parent() post: Post) {
    const param: ICommentableTo = {
      id: post.id,
      commentableId: post.commentableId
    };
    return this.commentableLoader.batchTotalComments.load(param);
  }

  @ResolveField('imageUploadable', () => ImageUploadableModel)
  async imageUploadable(@Parent() post: PostPrisma) {
    if (post && post.imageUploadableId) {
      const result = await this.imageUploadableLoader.batchImageUploadable.load({
        id: post.id,
        imageUploadableId: post.imageUploadableId
      } as IImageUploadableTo);
      return {
        id: result?.id,
        uploads: result?.uploads
      };
    }
  }

  @ResolveField('page', () => Page)
  async page(@Parent() post: Post) {
    return post?.pageId ? this.postLoader.batchPages.load(post?.pageId) : null;
  }

  @ResolveField('token', () => Token)
  async token(@Parent() post: Post) {
    return post?.tokenId ? this.postLoader.batchPages.load(post?.tokenId) : null;
  }

  @ResolveField('translations', () => [PostTranslation])
  async translations(@Parent() post: Post) {
    if (post.translations) {
      const translations = await this.prisma.post
        .findUnique({
          where: {
            id: post.id
          }
        })
        .translations();

      return translations;
    }
    return null;
  }

  @ResolveField('danaViewScore', () => Number)
  async danaViewScore(@Parent() post: Post) {
    return this.timelineableLoader.batchDanaViewScores.load(post.id);
  }

  @ResolveField('followPostOwner', () => Boolean)
  async followPostOwner(@Parent() post: Post, @AccountEntity() account: Account) {
    const payload = {
      followingAccountId: post?.accountId,
      accountId: account?.id
    };
    return this.timelineableLoader.batchCheckAccountFollowAllAccount.load(payload);
  }

  @ResolveField('followedPage', () => Boolean)
  async followedPage(@Parent() post: Post, @AccountEntity() account: Account) {
    const payload = {
      pageId: post?.pageId || '',
      accountId: account?.id
    };
    return this.timelineableLoader.batchCheckAccountFollowAllPage.load(payload);
  }

  @ResolveField('followedToken', () => Boolean)
  async followedToken(@Parent() post: Post, @AccountEntity() account: Account) {
    const payload = {
      tokenId: post?.tokenId || '',
      accountId: account?.id
    };
    return this.timelineableLoader.batchCheckAccountFollowAllToken.load(payload);
  }

  @ResolveField('dana', () => PostDana)
  async dana(@Parent() post: Post) {
    return this.timelineableLoader.batchDanas.load(post.id);
  }

  @ResolveField('boostScore', () => PostBoost)
  async boostScore(@Parent() post: Post) {
    return this.timelineableLoader.batchBoosts.load(post.id);
  }

  @ResolveField('isBookmarked', () => Boolean)
  async isBookmarked(@Parent() post: Post, @AccountEntity() account: Account) {
    const payload = {
      timelineIds: `${post.type}:${post.id}`,
      accountId: account?.id
    };
    return this.bookmarkLoader.batchCheckAllBookmark.load(payload);
  }

  @ResolveField('burnedByOthers', () => Boolean)
  async burnedByOthers(@Parent() post: Post) {
    return this.postLoader.batchPostHasBurnedByOthers.load(post.id);
  }

  @ResolveField('poll', () => Poll)
  async poll(@Parent() post: Post) {
    return this.postLoader.batchPolls.load(post.id);
  }

  @ResolveField('offer', () => Offer)
  async offer(@Parent() post: Post) {
    return this.postLoader.batchOffers.load(post.id);
  }
}
