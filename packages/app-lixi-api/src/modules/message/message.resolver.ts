import {
  Account,
  CreateMessageInput,
  ImageUploadable as ImageUploadableModel,
  Message,
  MessageConnection,
  MessageOrder,
  PaginationArgs,
  WebpushNotification
} from '@bcpros/lixi-models';
import {
  ImageUploadable,
  ImageUploadableType,
  MessageType,
  NotificationLevel,
  PageMessageSessionStatus
} from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Inject, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { ChronikClient } from 'chronik-client';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';
import { NotificationGateway } from 'src/common/modules/notifications/notification.gateway';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { MeiliService } from '../page/meili.service';
import { PrismaService } from '../prisma/prisma.service';
import { XPIJS } from '../wallet/wallet.constants';
import { PageMessageSessionCacheService } from './page-message-session-cache.service';
import { NOTIFICATION_TYPES } from 'src/common/modules/notifications/notification.constants';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Message)
@UseFilters(GqlHttpExceptionFilter)
export class MessageResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService,
    private notificationGateway: NotificationGateway,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    private readonly notificationService: NotificationService,
    private readonly pageMessageSessionCacheService: PageMessageSessionCacheService
  ) {}

  @Subscription(() => Message)
  messageCreated() {
    return pubSub.asyncIterator('messageCreated');
  }

  @Query(() => Message)
  async message(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.message.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => MessageConnection)
  async allMessageByPageMessageSessionId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true }) id: string,
    @Args({
      name: 'orderBy',
      type: () => MessageOrder,
      nullable: true
    })
    orderBy: MessageOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.message.findMany({
          include: { author: true, pageMessageSession: true },
          where: {
            pageMessageSessionId: id
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.message.count({
          where: {
            pageMessageSessionId: id
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Message)
  async createMessage(@AccountEntity() account: Account, @Args('data') data: CreateMessageInput) {
    if (!account) {
      const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { authorId, body, isPageOwner, pageMessageSessionId, tipHex, uploadIds } = data;
    let tipValue;

    if (account.id !== authorId) {
      return null;
    }

    //check pageMessageSession is open
    const pageMessageSession = await this.prisma.pageMessageSession.findUnique({
      where: {
        id: pageMessageSessionId
      },
      select: {
        status: true,
        id: true,
        account: {
          select: {
            id: true,
            address: true,
            name: true
          }
        },
        page: {
          select: {
            name: true,
            pageAccount: {
              select: {
                id: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (pageMessageSession && pageMessageSession.status === PageMessageSessionStatus.OPEN) {
      const updatedAt = new Date();
      let imageUploadable: ImageUploadable | null = null;

      //check if there is upload
      if (uploadIds && uploadIds.length > 0) {
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
                      in: uploadIds
                    }
                  }
                }
              }
            ]
          }
        });
      }

      const message = await this.prisma.$transaction(async prisma => {
        const result = await prisma.message.create({
          data: {
            body: body,
            isPageOwner: isPageOwner ?? false,
            author: { connect: { id: authorId } },
            pageMessageSession: { connect: { id: pageMessageSessionId } },
            imageUploadable: { connect: imageUploadable ? { id: imageUploadable.id } : undefined },
            messageType: imageUploadable ? MessageType.IMAGE : MessageType.TEXT
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                address: true
              }
            },
            pageMessageSession: {
              select: {
                pageId: true
              }
            },
            imageUploadable: {
              include: {
                uploads: {
                  select: {
                    id: true,
                    sha: true,
                    bucket: true,
                    width: true,
                    height: true,
                    cfImageId: true,
                    cfImageFilename: true
                  }
                }
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
              type: ImageUploadableType.MESSAGE
            }
          });
        }

        //Give Tip
        if (tipHex && body) {
          tipValue = parseFloat(body.toLowerCase().split(' ')[1]);
          const broadcastResponse = await this.chronik.broadcastTx(tipHex);
          if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
          }

          const { txid } = broadcastResponse;
          const determineAddress = isPageOwner
            ? {
                fromAddress: pageMessageSession.page.pageAccount.address,
                fromAccountId: pageMessageSession.page.pageAccount.id,
                toAddress: pageMessageSession.account.address,
                toAccountId: pageMessageSession.account.id
              }
            : {
                fromAddress: pageMessageSession.account.address,
                fromAccountId: pageMessageSession.account.id,
                toAddress: pageMessageSession.page.pageAccount.address,
                toAccountId: pageMessageSession.page.pageAccount.id
              };

          const transactionTip = {
            txid,
            ...determineAddress,
            tipValue: tipValue
          };
          await prisma.giveTipMessage.create({
            data: {
              ...transactionTip,
              message: {
                connect: {
                  id: result.id
                }
              }
            }
          });
        }

        return result;
      });

      const result = {
        ...message,
        pageMessageSessionId: pageMessageSessionId,
        updatedAt: updatedAt
      };

      const webpushNotification: WebpushNotification = {
        senderId: authorId,
        recipientId: isPageOwner ? pageMessageSession.account.id : pageMessageSession.page.pageAccount.id,
        message: body,
        senderName: account.name,
        url: `/page-message`,
        title: isPageOwner ? `${pageMessageSession.page.name} sent you a message` : `${account.name} sent you a message`
      };

      await this.pageMessageSessionCacheService.setLatestMessage(
        pageMessageSession.id,
        result.id,
        result.body!,
        authorId.toString(),
        account.address
      );

      await this.notificationService.dispatchMessagePushNotification(webpushNotification);

      //notification for give message
      if (tipHex) {
        const messageToGiveData = {
          senderName: isPageOwner ? pageMessageSession.page.name : pageMessageSession.account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar,
          xpiGive: tipValue
        };
        const createNotif = {
          senderId: account.id,
          recipientId: isPageOwner ? pageMessageSession.account.id : pageMessageSession.page.pageAccount.id,
          notificationTypeId: NOTIFICATION_TYPES.MESSAGE_TO_GIVE,
          level: NotificationLevel.INFO,
          url: `page-message`,
          additionalData: messageToGiveData
        };

        const jobData = {
          notification: createNotif
        };
        createNotif.senderId !== createNotif.recipientId &&
          (await this.notificationService.saveAndDispatchNotification(jobData.notification));
      }

      this.notificationGateway.publishMessage(pageMessageSessionId!, result);

      return result;
    }
  }

  @ResolveField()
  async pageMessageSession(@Parent() message: Message) {
    const pageMessageSession = await this.prisma.message
      .findFirst({
        where: {
          id: message.id
        }
      })
      .pageMessageSession();
    return pageMessageSession;
  }

  @ResolveField('imageUploadable', () => ImageUploadableModel)
  async imageUploadable(@Parent() message: Message) {
    const imageUploadable = await this.prisma.message
      .findUnique({
        where: {
          id: message.id
        }
      })
      .imageUploadable({
        include: {
          uploads: {
            select: {
              id: true,
              sha: true,
              bucket: true,
              width: true,
              height: true,
              cfImageId: true,
              cfImageFilename: true
            }
          }
        }
      });
    return imageUploadable;
  }
}
