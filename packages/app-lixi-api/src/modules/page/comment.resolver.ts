import {
  Account,
  Comment,
  CommentConnection,
  CommentOrder,
  Commentable,
  CreateCommentInput,
  PaginationArgs,
  UploadDetail,
  ImageUploadable as ImageUploadableModel,
  IImageUploadableTo
} from '@bcpros/lixi-models';
import {
  CommentType,
  NotificationLevel,
  Comment as CommentPrisma,
  ImageUploadable,
  ImageUploadableType
} from '@bcpros/lixi-prisma';
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
import { AccountEntity } from 'src/decorators';
import VError from 'verror';
import { NOTIFICATION_TYPES } from '../../common/modules/notifications/notification.constants';
import { AccountCacheService } from '../account/account-cache.service';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { XPIJS } from '../wallet/wallet.constants';
import { CommentCacheService } from './comment-cache.service';
import CommentLoader from './comment.loader';
import CommentableLoader from './commentable.loader';
import ImageUploadableLoader from './imageUploadable.loader';

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
    private readonly commentableLoader: CommentableLoader,
    private readonly notificationService: NotificationService,
    private readonly accountCacheService: AccountCacheService,
    private readonly commentCacheService: CommentCacheService,
    private readonly imageUploadableLoader: ImageUploadableLoader
  ) {}

  @Query(() => Comment)
  async comment(@Args('id', { type: () => String }) id: string) {
    return await this.commentCacheService.getById(id);
  }

  @Query(() => CommentConnection)
  @UseGuards(GqlJwtAuthGuardByPass)
  async commentsToCommentableId(
    @AccountEntity() account: Account,
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
            { parentId: null },
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
                  { parentId: null },
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
          include: {
            commentAccount: true,
            imageUploadable: {
              include: {
                uploads: true
              }
            }
          },
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
  async createComment(@AccountEntity() account: Account, @Args('data') data: CreateCommentInput) {
    try {
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const { commentText, commentableId, tipHex, createFeeHex, uploadId } = data;
      let imageUploadable: ImageUploadable | null = null;

      const arrayStringComment = commentText.toLowerCase().split(' ');
      const indexOfGiveString = arrayStringComment.findIndex(item => item === '/give');
      const tipValue = parseFloat(arrayStringComment[indexOfGiveString + 1]);

      //find existing imageUploadable
      if (uploadId) {
        imageUploadable = await this.prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                accountId: account.id
              },
              {
                uploads: {
                  every: {
                    id: uploadId
                  }
                }
              }
            ]
          }
        });
      }

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
                account: true
              }
            })
          : null;

      const createFee = post?.account?.createCommentFee ? parseFloat(post?.account?.createCommentFee) : 0;

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
            createFee: tipHex ? 0 : createFee,
            commentDana: {
              create: {}
            },
            imageUploadable: {
              connect: imageUploadable ? { id: imageUploadable.id } : undefined
            },
            commentToId: ''
          }
        });

        if (imageUploadable) {
          await prisma.imageUploadable.update({
            where: {
              id: imageUploadable?.id
            },
            data: {
              type: ImageUploadableType.COMMENT
            }
          });
        }

        //Check if tipHex then create tip transaction
        if (tipHex && post) {
          const transactionTip = {
            txid,
            fromAddress: account.address,
            fromAccountId: account.id,
            toAddress: post?.account.address as string,
            toAccountId: post?.account.id as number,
            tipValue: tipValue,
            commentId: createdComment.id
          };
          await prisma.giveTip.create({ data: transactionTip });
        }

        // Clear the cache from relevant loaders
        await this.commentableLoader.batchTotalComments.clear({
          id: post?.id ?? '',
          commentableId
        });

        return createdComment;
      });

      if (savedComment && post) {
        const recipient = await this.accountCacheService.getById(_.toSafeInteger(post?.accountId));
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
          recipientId: post?.account.id as number,
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Comment)
  async createReplyComment(@AccountEntity() account: Account, @Args('data') data: CreateCommentInput) {
    try {
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const { commentText, commentableId, tipHex, createFeeHex, uploadId, replyCommentId } = data;
      let imageUploadable: ImageUploadable | null = null;
      const arrayStringComment = commentText.toLowerCase().split(' ');
      const indexOfGiveString = arrayStringComment.findIndex(item => item === '/give');
      const tipValue = parseFloat(arrayStringComment[indexOfGiveString + 1]);

      //find existing imageUploadable
      if (uploadId) {
        imageUploadable = await this.prisma.imageUploadable.findFirst({
          where: {
            AND: [
              {
                accountId: account.id
              },
              {
                uploads: {
                  every: {
                    id: uploadId
                  }
                }
              }
            ]
          }
        });
      }

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
                account: true
              }
            })
          : null;

      const replyComment = await this.prisma.comment.findFirst({
        where: { id: replyCommentId ?? '' },
        include: { commentAccount: true }
      });
      if (!replyComment) throw new Error('Reply comment invalid');

      const createFee = post?.account?.createCommentFee ? parseFloat(post?.account?.createCommentFee) : 0;

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
            createFee: tipHex ? 0 : createFee,
            commentDana: {
              create: {}
            },
            imageUploadable: {
              connect: imageUploadable ? { id: imageUploadable.id } : undefined
            },
            commentToId: '',
            parentId: replyCommentId
          }
        });

        if (imageUploadable) {
          await prisma.imageUploadable.update({
            where: {
              id: imageUploadable?.id
            },
            data: {
              type: ImageUploadableType.COMMENT
            }
          });
        }

        //Check if tipHex then create tip transaction
        if (tipHex && post) {
          const transactionTip = {
            txid,
            fromAddress: account.address,
            fromAccountId: account.id,
            toAddress: replyComment?.commentAccount?.address as string,
            toAccountId: replyComment?.commentAccountId as number,
            tipValue: tipValue,
            commentId: createdComment.id
          };
          await prisma.giveTip.create({ data: transactionTip });
        }

        // Clear the cache from relevant loaders
        await this.commentableLoader.batchTotalComments.clear({
          id: post?.id ?? '',
          commentableId
        });

        return createdComment;
      });

      if (savedComment && post) {
        //create closure table
        await this.prisma.$transaction(async prisma => {
          //get ancestor of replyComment
          const ancestorComment = await prisma.closure.findMany({
            where: {
              descendant: replyCommentId ?? ''
            },
            select: { ancestor: true, depth: true, comment: true },
            orderBy: { depth: 'desc' }
          });

          //take max-depth
          const maxDepthComment = ancestorComment[0];
          const dataCreateClosure = ancestorComment.map(closureItem => {
            const plusDepth = closureItem.depth + 1;
            //take depth of parent if maxdepth is 2
            const depthOfNewComment = maxDepthComment?.depth === 2 ? closureItem.depth : plusDepth;
            return {
              ancestor: closureItem.ancestor,
              descendant: savedComment.id,
              depth: depthOfNewComment,
              commentId: savedComment.id ?? ''
            };
          });

          if (maxDepthComment?.depth === 2) {
            //update parentId of comment
            await this.prisma.comment.update({
              where: { id: savedComment.id ?? '' },
              data: { parentId: maxDepthComment.comment.parentId }
            });
            savedComment.parentId = maxDepthComment.comment.parentId;
          } else {
            dataCreateClosure.unshift({
              ancestor: replyCommentId ?? '',
              descendant: savedComment.id,
              depth: 1,
              commentId: savedComment.id ?? ''
            });
          }

          await prisma.closure.createMany({
            data: dataCreateClosure
          });
        });

        //notification to reply-comment-account
        const recipient = await this.accountCacheService.getById(_.toSafeInteger(replyComment?.commentAccountId));
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
          recipientId: replyComment?.commentAccountId as number,
          notificationTypeId: tipHex ? NOTIFICATION_TYPES.COMMENT_TO_GIVE : NOTIFICATION_TYPES.COMMENT_TO_REPLY,
          level: NotificationLevel.INFO,
          url: `/post/${post?.id}?comment=${savedComment.id}`,
          additionalData: tipHex ? commentToGiveData : commentToPostData,
          senderName: replyComment?.commentAccount?.name
        };
        const jobData = {
          notification: createNotif
        };
        createNotif.senderId !== createNotif.recipientId &&
          (await this.notificationService.saveAndDispatchNotification(jobData.notification));
      }

      return new Comment({ ...savedComment });
    } catch (err) {
      console.log(err);
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

  @ResolveField('imageUploadable', () => ImageUploadableModel)
  async imageUploadable(@Parent() comment: CommentPrisma) {
    if (comment && comment.imageUploadableId) {
      const result = this.imageUploadableLoader.batchImageUploadable
        .load({
          id: comment.id,
          imageUploadableId: comment.imageUploadableId
        } as IImageUploadableTo)
        .then(result => {
          return {
            id: result?.id,
            uploads: result?.uploads
          };
        });

      return result;
    }
  }

  @ResolveField('commentable', () => Commentable)
  async commentable(@Parent() comment: Comment) {
    if (!comment?.commentableId) return null;

    return this.commentLoader.batchCommentable.load(comment.commentableId);
  }

  @ResolveField('children', () => [Comment])
  async children(@Parent() comment: Comment) {
    return this.commentLoader.batchReplyComment.load(comment.id);
  }
}
