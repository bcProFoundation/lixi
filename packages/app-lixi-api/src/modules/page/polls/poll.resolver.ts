import { Account, CommentType, CreatePollInput, Poll, Post } from '@bcpros/lixi-models';
import { PostType } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import { ChronikClient } from 'chronik-client';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'nestjs-chronik';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { NOTIFICATION_TYPES } from '../../../common/modules/notifications/notification.constants';
import { AccountCacheService } from '../../account/account-cache.service';
import { FollowCacheService } from '../../account/follow-cache.service';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../../auth/guards/gql-jwtauth.guard';
import { HashtagService } from '../../hashtag/hashtag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { XPIJS } from '../../wallet/wallet.constants';
import { CONTENT_FANOUT_QUEUE } from '../constants';
import { HASHTAG, POSTS } from '../constants/meili.constants';
import { MeiliService } from '../meili.service';
import TimelineableLoader from '../timelineable.loader';
import { PollCacheService } from './poll-cache.service';
import { PollAnswerOnAccount, CreateVoteInput } from '@bcpros/lixi-models';
import { AccountDanaCacheService } from 'src/modules/account/account-dana-cache.service';
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
    private readonly accountCacheService: AccountCacheService,
    private readonly accountDanaCacheService: AccountDanaCacheService,
    private readonly pollLoader: PollLoader
  ) {}

  @SkipThrottle()
  @Query(() => Poll)
  @UseGuards(GqlJwtAuthGuardByPass)
  async poll(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    return this.pollCacheService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Post)
  async createPoll(@AccountEntity() account: Account, @Args('data') data: CreatePollInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { startDate, endDate, tokenId, pageId, options, createFeeHex, question } = data;
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

      const createdPoll = await prisma.post.create({
        data: {
          content: '',
          account: { connect: { id: account.id } },
          page: {
            connect: pageId ? { id: pageId } : undefined
          },
          token: {
            connect: tokenId ? { id: tokenId } : undefined
          },
          commentable: {
            create: {
              type: CommentType.POLL
            }
          },
          type: PostType.POLL,
          txid: txid,
          createFee: createFee,
          dana: {
            create: {}
          },
          taggable: {
            create: {}
          },
          poll: {
            create: {
              startDate,
              endDate,
              options: {
                create: options
              },
              question
            }
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

      return createdPoll;
    });

    //Hashtag
    // const hashtags = await this.hashtagService.extractAndSave(
    //   `${process.env.MEILISEARCH_BUCKET}_${HASHTAG}`,
    //   pureContent,
    //   savedPoll.id
    // );

    const indexedPost = {
      id: savedPoll.id,
      content: question,
      postAccountName: savedPoll.account.name,
      createdAt: savedPoll.createdAt,
      updatedAt: savedPoll.updatedAt,
      page: {
        id: savedPoll.page?.id,
        name: savedPoll.page?.name
      },
      type: 'POLL'
      // hashtag: hashtags
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
        url: `/post/${savedPoll.id}`,
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
    await this.postFanoutQueue.add(CONTENT_FANOUT_QUEUE, { post: savedPoll });

    return savedPoll;
  }

  @SkipThrottle()
  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => PollAnswerOnAccount)
  async createVote(@AccountEntity() account: Account, @Args('data') data: CreateVoteInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }
    const { accountId, previousOptionIds, optionId, singleSelect, pollId } = data;

    if (account.id !== accountId) {
      const noPermission = await this.i18n.t('account.messages.noPermission');
      throw new Error(noPermission);
    }

    let createdPollAnswer;
    const accountDana = await this.accountDanaCacheService.getAccountDana(accountId);

    //process 2 type vote
    if (singleSelect) {
      if (previousOptionIds && previousOptionIds.length > 0) {
        //check user has voted for the same option
        //if has, update it
        if (previousOptionIds[0] === optionId) {
          createdPollAnswer = await this.prisma.pollAnswerOnAccount.updateMany({
            where: { AND: [{ pollOptionId: optionId }, { accountId }] },
            data: { pollDanaScore: accountDana?.danaGiven || 0 }
          });
        } else {
          //if not, remove old option and create new one
          createdPollAnswer = await this.prisma.$transaction(async prisma => {
            await prisma.pollAnswerOnAccount.deleteMany({
              where: { AND: [{ pollOptionId: previousOptionIds[0] }, { accountId }] }
            });
            const createdNewAnswer = await prisma.pollAnswerOnAccount.create({
              data: {
                accountId,
                pollOptionId: optionId,
                pollDanaScore: accountDana?.danaGiven
              }
            });
            return createdNewAnswer;
          });
        }
      } else {
        createdPollAnswer = await this.prisma.pollAnswerOnAccount.create({
          data: {
            accountId,
            pollOptionId: optionId,
            pollDanaScore: accountDana?.danaGiven
          }
        });
      }
    } else {
      //TODO (mutiple select)
    }

    //remove cache poll
    await this.pollCacheService.removeByKeys([pollId]);

    return createdPollAnswer;
  }

  @ResolveField('defaultOptions', () => [String])
  async defaultOptions(@Parent() poll: Poll, @AccountEntity() account: Account) {
    const param = {
      accountId: account?.id,
      postId: poll.postId
    };
    return this.pollLoader.batchDefaultOptionsPoll.load(param);
  }

  @ResolveField('totalVote', () => Number)
  async totalVote(@Parent() poll: Poll) {
    return this.pollLoader.batchTotalVote.load(poll.postId);
  }
}
