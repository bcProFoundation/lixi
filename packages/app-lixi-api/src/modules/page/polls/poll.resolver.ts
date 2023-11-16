import { Account, CommentType, CreatePollInput, Page, Poll, PollDana, Post } from '@bcpros/lixi-models';
import BCHJS from '@bcpros/xpi-js';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import { ChronikClient } from 'chronik-client';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { PostAccountEntity } from 'src/decorators/postAccount.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { NOTIFICATION_TYPES } from '../../../common/modules/notifications/notification.constants';
import { AccountCacheService } from '../../account/account-cache.service';
import { FollowCacheService } from '../../account/follow-cache.service';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../../auth/guards/gql-jwtauth.guard';
import { HashtagService } from '../../hashtag/hashtag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { XPIJS } from '../../wallet/wallet.constants';
import { HASHTAG, POSTS } from '../constants/meili.constants';
import { CONTENT_FANOUT_QUEUE } from '../constants';
import ImageUploadableLoader from '../imageUploadable.loader';
import { MeiliService } from '../meili.service';
import PageLoader from '../page.loader';
import PostLoader from '../post.loader';
import { PollCacheService } from './poll-cache.service';
import PollLoader from './poll.loader';

@Injectable()
@Resolver(() => Poll)
@UseFilters(GqlHttpExceptionFilter)
export class PollResolver {
  constructor(
    private readonly followCacheService: FollowCacheService,
    private readonly prisma: PrismaService,
    private readonly meiliService: MeiliService,
    @InjectQueue(CONTENT_FANOUT_QUEUE) private postFanoutQueue: Queue,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    @I18n() private i18n: I18nService,
    private readonly hashtagService: HashtagService,
    private readonly pollCacheService: PollCacheService,
    private readonly notificationService: NotificationService,
    private readonly pollLoader: PollLoader,
    private readonly pageLoader: PageLoader,
    private readonly postLoader: PostLoader,
    private readonly accountCacheService: AccountCacheService
  ) {}

  @SkipThrottle()
  @Query(() => Poll)
  @UseGuards(GqlJwtAuthGuardByPass)
  async poll(@PostAccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    return this.pollCacheService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Poll)
  async create(@PostAccountEntity() account: Account, @Args('data') data: CreatePollInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { startDate, endDate, pageId, htmlContent, pureContent, options, createFeeHex } = data;
    let createFee: any;

    const savedPoll = await this.prisma.$transaction(async prisma => {
      let txid: string | undefined;
      if (createFeeHex) {
        const broadcastResponse = await this.chronik.broadcastTx(createFeeHex);
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
        txid = broadcastResponse.txid;
      }

      const createdPoll = await prisma.poll.create({
        data: {
          question: htmlContent,
          account: { connect: { id: account.id } },
          page: {
            connect: pageId ? { id: pageId } : undefined
          },
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
          startDate,
          endDate,
          taggable: {
            create: {}
          },
          options: {
            create: options
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
          account: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      return createdPoll;
    });

    //Hashtag
    const hashtags = await this.hashtagService.extractAndSave(
      `${process.env.MEILISEARCH_BUCKET}_${HASHTAG}`,
      pureContent,
      savedPoll.id
    );

    const indexedPost = {
      id: savedPoll.id,
      content: pureContent,
      postAccountName: savedPoll.account.name,
      createdAt: savedPoll.createdAt,
      updatedAt: savedPoll.updatedAt,
      page: {
        id: savedPoll.page?.id,
        name: savedPoll.page?.name
      },
      type: 'POLL',
      hashtag: hashtags
    };

    await this.meiliService.add(`${process.env.MEILISEARCH_BUCKET}_${POSTS}`, indexedPost, savedPoll.id);

    let listAccountFollowerIds: number[] = [];
    // Notification
    if (pageId && savedPoll) {
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
        url: `/poll/${savedPoll.id}`,
        additionalData: {
          senderName: account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar,
          pageName: savedPoll?.page?.name
        }
      };

      createNotif.senderId !== createNotif.recipientId &&
        (await this.notificationService.saveAndDispatchNotification(createNotif));

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
    await this.postFanoutQueue.add(CONTENT_FANOUT_QUEUE, { poll: savedPoll });

    return savedPoll;
  }

  @ResolveField('page', () => Page)
  async page(@Parent() poll: Poll) {
    return poll?.pageId ? this.pageLoader.batchPages.load(poll?.pageId) : null;
  }

  @ResolveField('danaViewScore', () => Number)
  async danaViewScore(@Parent() poll: Poll) {
    return this.postLoader.batchDanaViewScores.load(poll.id);
  }

  @ResolveField('followOwner', () => Boolean)
  async followOwner(@Parent() post: Post, @PostAccountEntity() account: Account) {
    const payload = {
      followingAccountId: post?.postAccount?.id,
      accountId: account?.id
    };
    return this.postLoader.batchCheckAccountFollowAllAccount.load(payload);
  }

  @ResolveField('followedPage', () => Boolean)
  async followedPage(@Parent() post: Post, @PostAccountEntity() account: Account) {
    const payload = {
      pageId: post?.page?.id || '',
      accountId: account?.id
    };
    return this.postLoader.batchCheckAccountFollowAllPage.load(payload);
  }

  @ResolveField('followedToken', () => Boolean)
  async followedToken(@Parent() post: Post, @PostAccountEntity() account: Account) {
    const payload = {
      tokenId: post?.token?.tokenId || '',
      accountId: account?.id
    };
    return this.postLoader.batchCheckAccountFollowAllToken.load(payload);
  }

  @ResolveField('dana', () => PollDana)
  async dana(@Parent() poll: Poll) {
    return this.pollLoader.batchDanas.load(poll.id);
  }
}
