import {
  Account,
  Comment,
  CommentConnection,
  CommentOrder,
  Commentable,
  CreateCommentInput,
  PaginationArgs
} from '@bcpros/lixi-models';
import { CommentType, NotificationLevel } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Inject, Logger, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { ChronikClient } from 'chronik-client';
import _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { PostAccountEntity } from 'src/decorators/postAccount.decorator';
import VError from 'verror';
import { NOTIFICATION_TYPES } from '../../common/modules/notifications/notification.constants';
import { AccountCacheService } from '../account/account-cache.service';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { XPIJS } from '../wallet/wallet.constants';
import { CommentCacheService } from './comment-cache.service';
import CommentLoader from './comment.loader';

@SkipThrottle()
@Resolver(() => Comment)
export class CommentResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    @Inject(XPIJS) private XPI: BCHJS,
    private readonly commentLoader: CommentLoader,
    private readonly notificationService: NotificationService,
    private readonly accountCacheService: AccountCacheService,
    private readonly commentCacheService: CommentCacheService
  ) {}

  @Query(() => Comment)
  async comment(@Args('id', { type: () => String }) id: string) {
    return await this.commentCacheService.getById(id);
  }

  @Query(() => CommentConnection)
  @UseGuards(GqlJwtAuthGuardByPass)
  async commentsToCommentableId(
    @PostAccountEntity() account: Account,
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string,
    @Args({
      name: 'orderBy',
      type: () => CommentOrder,
      nullable: true
    })
    orderBy: CommentOrder
  ) {
    const queryComments: any = {
      OR: [
        {
          AND: [
            {
              commentableId: id
            },
            {
              danaBurnScore: {
                gte: 0
              }
            }
          ]
        },
        ...(account && account.id
          ? [
              {
                AND: [
                  { commentableId: id },
                  {
                    commentAccount: {
                      id: account.id
                    }
                  }
                ]
              }
            ]
          : [])
      ]
    };

    const result = await findManyCursorConnection(
      args =>
        this.prisma.comment.findMany({
          include: { commentAccount: true },
          where: queryComments,
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.comment.count({
          where: queryComments
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Comment)
  async createComment(@PostAccountEntity() account: Account, @Args('data') data: CreateCommentInput) {
    try {
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const { commentText, commentableId, tipHex, createFeeHex } = data;

      const commentable = await this.prisma.commentable.findUnique({
        where: {
          id: commentableId
        }
      });

      if (!commentable) throw new Error('Could not create new comment.');

      const post =
        commentable.type === CommentType.POST
          ? await this.prisma.post.findFirst({
              where: {
                commentableId: commentableId
              },
              include: {
                postAccount: true
              }
            })
          : null;

      let createFee: any;
      let tipValue: any;

      const savedComment = await this.prisma.$transaction(async prisma => {
        let txid: string = '';
        if (createFeeHex) {
          const broadcastResponse = await this.chronik.broadcastTx(createFeeHex);
          if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
          }
          txid = broadcastResponse.txid;
        }

        if (tipHex) {
          const broadcastResponse = await this.chronik.broadcastTx(tipHex);
          if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
          }

          txid = broadcastResponse.txid;
        }

        const createdComment = await prisma.comment.create({
          data: {
            commentText: commentText,
            commentAccount: { connect: { id: account.id } },
            commentable: { connect: { id: commentableId || undefined } },
            txid: txid,
            createFee: createFee,
            commentDana: {
              create: {}
            },
            commentToId: ''
          }
        });

        //Check if tipHex then create tip transaction
        if (tipHex && post) {
          const transactionTip = {
            txid,
            fromAddress: account.address,
            fromAccountId: account.id,
            toAddress: post?.postAccount.address as string,
            toAccountId: post?.postAccount.id as number,
            tipValue: tipValue,
            commentId: createdComment.id
          };
          await prisma.giveTip.create({ data: transactionTip });
        }

        return createdComment;
      });

      if (savedComment && post) {
        const recipient = await this.accountCacheService.getById(_.toSafeInteger(post?.postAccountId));
        if (!recipient) {
          const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
          throw new VError(accountNotExistMessage);
        }

        let commentToGiveData;
        const commentToPostData = {
          senderName: account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar
        };

        if (tipHex) {
          commentToGiveData = {
            senderName: account.name,
            senderAddress: account.address,
            senderAvatar: account.avatar,
            xpiGive: tipValue
          };
        }

        const createNotif = {
          senderId: account.id,
          recipientId: post?.postAccount.id as number,
          notificationTypeId: tipHex ? NOTIFICATION_TYPES.COMMENT_TO_GIVE : NOTIFICATION_TYPES.COMMENT_ON_POST,
          level: NotificationLevel.INFO,
          url: `/post/${post?.id}?comment=${savedComment.id}`,
          additionalData: tipHex ? commentToGiveData : commentToPostData
        };
        const jobData = {
          notification: createNotif
        };
        createNotif.senderId !== createNotif.recipientId &&
          (await this.notificationService.saveAndDispatchNotification(jobData.notification));
      }

      return new Comment({ ...savedComment });
    } catch (err) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @ResolveField('commentAccount', () => Account)
  async postAccount(@Parent() comment: Comment) {
    const account = await this.accountCacheService.getById(_.toSafeInteger(comment.commentAccountId));
    return account;
  }

  @ResolveField('commentable', () => Commentable)
  async commentable(@Parent() comment: Comment) {
    if (!comment?.commentableId) return null;

    return this.commentLoader.batchCommentable.load(comment.commentableId);
  }
}
