import {
  Account,
  CommentType,
  CreateEventInput,
  Event,
  ImageUploadableType,
  Page,
  Poll,
  Post
} from '@bcpros/lixi-models';
import { PostType } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
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
import { PrismaService } from '../../prisma/prisma.service';
import { XPIJS } from '../../wallet/wallet.constants';
import TimelineableLoader from '../timelineable.loader';
import { EventCacheService } from './event-cache.service';

@Injectable()
@Resolver(() => Event)
@UseFilters(GqlHttpExceptionFilter)
export class EventResolver {
  constructor(
    private readonly followCacheService: FollowCacheService,
    private prisma: PrismaService,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    @I18n() private i18n: I18nService,
    private readonly eventCacheService: EventCacheService,
    private readonly timelineableLoader: TimelineableLoader,
    private readonly notificationService: NotificationService,
    private readonly accountCacheService: AccountCacheService
  ) {}

  @SkipThrottle()
  @Query(() => Event)
  @UseGuards(GqlJwtAuthGuardByPass)
  async poll(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    return this.eventCacheService.getById(id);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Event)
  async create(@AccountEntity() account: Account, @Args('data') data: CreateEventInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { eventType, name, startDate, endDate, uploads, tokenId, pageId, htmlContent, pureContent } = data;
    let imageUploadable;

    //create new imageUploadable
    if (uploads && uploads.length > 0) {
      imageUploadable = await this.prisma.$transaction(async prisma => {
        const result = await prisma.imageUploadable.create({
          data: {
            account: { connect: { id: account.id } },
            uploads: {
              connect: uploads.map((upload: string) => {
                return { id: upload };
              })
            },
            type: ImageUploadableType.EVENT
          }
        });

        return result;
      });
    }

    let createFee: any;

    const savedEvent = await this.prisma.$transaction(async prisma => {
      let txid: string | undefined;
      if (data.createFeeHex) {
        const broadcastResponse = await this.chronik.broadcastTx(data.createFeeHex);
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
        txid = broadcastResponse.txid;
      }

      const createdEvent = await prisma.post.create({
        data: {
          content: htmlContent,
          account: { connect: { id: account.id } },
          page: {
            connect: pageId ? { id: pageId } : undefined
          },
          token: {
            connect: tokenId ? { id: tokenId } : undefined
          },
          commentable: {
            create: {
              type: CommentType.EVENT
            }
          },
          txid: txid,
          createFee: createFee,
          dana: {
            create: {}
          },
          taggable: {
            create: {}
          },
          type: PostType.EVENT,
          event: {
            create: {
              name,
              startDate,
              endDate,
              eventType,
              description: htmlContent
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

      return createdEvent;
    });

    let listAccountFollowerIds: number[] = [];
    // Notification
    if (pageId && savedEvent) {
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
        url: `/post/${savedEvent.id}`,
        additionalData: {
          senderName: account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar,
          pageName: savedEvent?.page?.name
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
    return savedEvent;
  }
}
