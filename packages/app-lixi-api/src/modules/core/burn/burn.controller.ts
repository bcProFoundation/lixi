import {
  Burn,
  BurnCommand,
  BurnForType,
  BurnType,
  COIN,
  PostDana,
  TRANSLATION_REQUIRE_AMOUNT,
  TokenDana,
  coinInfo
} from '@bcpros/lixi-models';
import { NotificationLevel } from '@bcpros/lixi-prisma';
import BCHJS from '@bcpros/xpi-js';
import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, HttpException, HttpStatus, Inject, Logger, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import { ChronikClient } from 'chronik-client';
import _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'nestjs-chronik';
import { NOTIFICATION_TYPES } from 'src/common/modules/notifications/notification.constants';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { XPIJS } from 'src/modules/wallet/wallet.constants';
import { VError } from 'verror';
import { AccountCacheService } from '../../account/account-cache.service';
import { PostDanaCacheService } from '../../page/post-dana-cache.service';
import { TokenDanaCacheService } from '../../token/token-dana-cache.service';
import { TranslateProvider } from '../translate/translate.constant';
import { TranslateService } from '../translate/translate.service';
import { ACCOUNT_DANA_QUEUE, BURN_FANOUT_QUEUE, PAGE_DANA_QUEUE } from './burn.constants';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import moment from 'moment';
import { template } from 'src/utils/stringTemplate';
import { fromSatoshisToCoin } from 'src/utils/cashMethods';

@SkipThrottle()
@Controller('burn')
export class BurnController {
  private logger: Logger = new Logger(BurnController.name);
  static topAccountWeekKey = 'topAccountDanaGiven:weekly:{{weekNumber}}:{{year}}';
  static topAccountMonthKey = 'topAccountDanaGiven:monthly:{{monthNumber}}:{{year}}';

  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClient('xrg') private chronikXRG: ChronikClient,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectQueue(BURN_FANOUT_QUEUE) private burnFanoutQueue: Queue,
    @InjectQueue(ACCOUNT_DANA_QUEUE) private accountDanaQueue: Queue,
    @InjectQueue(PAGE_DANA_QUEUE) private pageDanaQueue: Queue,
    private translateService: TranslateService,
    private readonly accountCacheService: AccountCacheService,
    private readonly postDanaCacheService: PostDanaCacheService,
    private readonly tokenDanaCacheService: TokenDanaCacheService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  private convertBurnedByToAddress(burnedBy: string): string {
    const legacyAddress = this.XPI.Address.hash160ToLegacy(burnedBy);

    const publicAddress = this.XPI.Address.toXAddress(legacyAddress);

    return publicAddress;
  }

  @Post()
  async burn(@Body() command: BurnCommand): Promise<Burn> {
    try {
      const { amountDana, coinBurned } = command;
      const value = parseFloat(command.burnValue);
      const savedBurn = await this.prisma.$transaction(async prisma => {
        let broadcastResponse: { txid: string } = { txid: '' };
        switch (coinBurned) {
          case COIN.XPI:
            broadcastResponse = await this.chronikXPI.broadcastTx(command.txHex).catch(async err => {
              const updatingWalletFund = await this.i18n.t('burn.messages.updatingWalletFund');
              throw new VError(updatingWalletFund);
            });
            break;
          case COIN.XRG:
            broadcastResponse = await this.chronikXRG.broadcastTx(command.txHex).catch(async err => {
              const updatingWalletFund = await this.i18n.t('burn.messages.updatingWalletFund');
              throw new VError(updatingWalletFund);
            });
            break;
        }

        const { txid } = broadcastResponse;
        const prevTxIdExist = await this.prisma.burn.findFirst({
          where: {
            txid: txid
          }
        });

        if (prevTxIdExist) {
          const burningCanceled = this.i18n.t('burn.messages.burningCanceled');
          throw new VError(burningCanceled);
        }

        const createdBurn = prisma.burn.create({
          data: {
            txid,
            burnType: command.burnType ? true : false,
            burnForType: command.burnForType,
            burnedBy: Buffer.from(command.burnedBy, 'hex'),
            burnForId: command.burnForId,
            burnedValue: value
          }
        });
        return createdBurn;
      });

      let createNotifBurnAndTip = null;
      let createNotifBurnWithoutTip = null;
      // prepare data sender
      const accountAddress = this.convertBurnedByToAddress(command.burnedBy);
      const sender = await this.prisma.account.findFirst({
        where: {
          address: accountAddress
        },
        include: {
          accountAvatarImageUploadable: {
            include: {
              uploads: {
                select: {
                  cfImageId: true,
                  url: true
                }
              }
            }
          }
        }
      });

      if (!sender) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      if (savedBurn) {
        //get avatar
        let avatarUrl;
        if (sender.accountAvatarImageUploadable) {
          const upload = sender.accountAvatarImageUploadable.uploads[0];
          const cfUrl = `${process.env.CF_IMAGES_DELIVERY_URL}/${process.env.CF_ACCOUNT_HASH}/${upload.cfImageId}/public`;
          avatarUrl = upload.cfImageId ? cfUrl : upload.url;
        }

        // get burnForType key
        const typeValuesArr = Object.values(BurnForType);
        const burnForTypeString =
          Object.keys(BurnForType)[typeValuesArr.indexOf(command.burnForType as unknown as BurnForType)];

        // BurnValue + tip + fee
        let fee = Number(command.burnValue) * 0.04;
        const cashDecimals =
          coinBurned === COIN.XRG ? coinInfo[COIN.XRG].microCashDecimals : coinInfo[coinBurned].cashDecimals;
        const smallestFee = parseFloat(fromSatoshisToCoin(coinInfo[coinBurned].dustSats, cashDecimals).toString());
        if (fee < smallestFee) {
          fee = smallestFee;
        }

        if (command.burnForType === BurnForType.Post) {
          const post = await this.prisma.post.findFirst({
            where: {
              id: command.burnForId
            },
            include: {
              page: true,
              account: true,
              dana: true
            }
          });

          if (!post) {
            const accountNotExistMessage = await this.i18n.t('post.messages.postNotExist');
            throw new VError(accountNotExistMessage);
          }

          const postHashtags = await this.prisma.postHashtag.findMany({
            where: {
              postId: post!.id
            },
            include: {
              hashtag: true
            }
          });

          let danaBurnUp = post?.dana?.danaBurnUp ?? 0;
          let danaBurnDown = post?.dana?.danaBurnDown ?? 0;
          let danaReceivedUp = post?.dana?.danaReceivedUp ?? 0;
          let danaReceivedDown = post?.dana?.danaReceivedDown ?? 0;

          if (command.burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + amountDana;
            danaReceivedUp = danaReceivedUp + amountDana;
          } else {
            danaBurnDown = danaBurnDown + amountDana;
            danaReceivedDown = danaReceivedDown + amountDana;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          const danaReceivedScore = danaReceivedUp - danaReceivedDown;

          // @todo: This is incorrect handle
          // not prepare for the conflict update
          // later we should move to each processor to read then update and retry if need
          await this.prisma.$transaction(async prisma => {
            const newPostDana = await prisma.postDana.upsert({
              where: {
                postId: command.burnForId,
                version: post?.dana?.version
              },
              update: {
                version: {
                  increment: 1
                },
                danaBurnUp,
                danaBurnDown,
                danaBurnScore,
                danaReceivedUp,
                danaReceivedDown,
                danaReceivedScore
              },
              create: {
                danaBurnDown,
                danaBurnUp,
                danaBurnScore,
                danaReceivedUp,
                danaReceivedDown,
                danaReceivedScore,
                postId: command.burnForId,
                version: 0
              }
            });

            await this.postDanaCacheService.setPostDana(command.burnForId, new PostDana({ ...newPostDana }));

            const burnByAddress = accountAddress;

            this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
              command: command,
              txid: savedBurn.txid,
              amount: amountDana,
              givenDanaAddress: burnByAddress,
              receivedDanaAddress: post?.account?.address
            });
          });

          //Translate if danaBurnScore >= TRANSLATION_REQUIRE_AMOUNT and hasnt been translate before
          //For now, the code below only support 2 langs (vi - en), need to rework code if support more than 2 langs
          if (danaBurnScore >= TRANSLATION_REQUIRE_AMOUNT && post?.originalLanguage === null) {
            await this.translateService.translatePostAndSave(TranslateProvider.AZURE, post?.content, post.id);
          }

          if (post && post.page) {
            await this.prisma.$transaction(async prisma => {
              let totalPostsBurnUp = post?.page?.totalPostsBurnUp ?? 0;
              let totalPostsBurnDown = post?.page?.totalPostsBurnDown ?? 0;

              if (command.burnType == BurnType.Up) {
                totalPostsBurnUp = totalPostsBurnUp + amountDana;
              } else {
                totalPostsBurnDown = totalPostsBurnDown + amountDana;
              }
              const totalPostsBurnScore = totalPostsBurnUp - totalPostsBurnDown;

              await prisma.page.update({
                where: {
                  id: post.pageId as string
                },
                data: {
                  totalPostsBurnUp,
                  totalPostsBurnDown,
                  totalPostsBurnScore
                }
              });

              this.pageDanaQueue.add(PAGE_DANA_QUEUE, {
                command: command,
                amount: amountDana,
                pageId: post.pageId
              });
            });
          }

          if (postHashtags.length > 0) {
            const hashtagBurnValue = amountDana / postHashtags.length;
            await this.prisma.$transaction(
              postHashtags.map(postHashtag => {
                let hashtagDanaBurnUp = postHashtag.hashtag.danaBurnUp ?? 0;
                let hashtagDanaBurnDown = postHashtag.hashtag.danaBurnDown ?? 0;

                if (command.burnType == BurnType.Up) {
                  hashtagDanaBurnUp = hashtagDanaBurnUp + hashtagBurnValue;
                } else {
                  hashtagDanaBurnDown = hashtagDanaBurnDown + hashtagBurnValue;
                }
                const hashTagDanaBurnScore = hashtagDanaBurnUp - hashtagDanaBurnDown;
                return this.prisma.hashtag.update({
                  where: {
                    id: postHashtag?.hashtag.id
                  },
                  data: {
                    danaBurnUp: hashtagDanaBurnUp,
                    danaBurnDown: hashtagDanaBurnDown,
                    danaBurnScore: hashTagDanaBurnScore
                  }
                });
              })
            );
          }

          const burnAccount = sender;

          // Put burn result to fanout
          await this.burnFanoutQueue.add(BURN_FANOUT_QUEUE, {
            burn: { ...savedBurn },
            post: post,
            latestDanaBurnScore: danaBurnScore,
            burnAccountId: burnAccount?.id,
            amountDana: amountDana
          });

          //prepare notification
          //If have page => Notif for postAccount withoutFee, notif for pageAccount withFee.
          const additionalData = {
            senderName: sender.name,
            senderAddress: sender.address,
            senderAvatar: avatarUrl,
            pageName: post.page && post.page.name,
            burnType: command.burnType == BurnType.Up ? 'upvoted' : 'downvoted',
            burnForType: burnForTypeString.toLowerCase(),
            xpiBurn: amountDana,
            xpiFee: fee,
            coin: coinInfo[coinBurned].ticker
          };
          if (post.page) {
            createNotifBurnAndTip = {
              senderId: sender.id,
              recipientId: post.page.pageAccountId,
              notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_PAGE,
              level: NotificationLevel.INFO,
              url: '/post/' + post?.id,
              additionalData
            };
            createNotifBurnWithoutTip = {
              senderId: sender.id,
              recipientId: post.accountId,
              notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_WITHOUT_FEE,
              level: NotificationLevel.INFO,
              url: '/post/' + post?.id,
              additionalData
            };
          } else {
            //Otherwise notif for postAccount withFee
            createNotifBurnAndTip = {
              senderId: sender.id,
              recipientId: post.accountId,
              notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_ACCOUNT,
              level: NotificationLevel.INFO,
              url: '/post/' + post?.id,
              additionalData
            };
          }
        } else if (command.burnForType === BurnForType.Token) {
          const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);

          const accountDana = await this.prisma.accountDana.findFirst({
            where: {
              account: {
                address: burnByAddress
              }
            }
          });

          const token = await this.prisma.token.findFirst({
            where: {
              tokenId: command.burnForId
            },
            include: {
              dana: true
            }
          });

          let danaBurnUp = token?.dana?.danaBurnUp ?? 0;
          let danaBurnDown = token?.dana?.danaBurnDown ?? 0;
          let danaReceivedUp = token?.dana?.danaReceivedUp ?? 0;
          let danaReceivedDown = token?.dana?.danaReceivedDown ?? 0;

          if (command.burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + amountDana;
          } else {
            danaBurnDown = danaBurnDown + amountDana;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          const danaReceivedScore = danaReceivedUp - danaReceivedDown;

          await this.prisma.$transaction(async prisma => {
            let givenUpValue = 0.0;
            let givenDownValue = 0.0;

            switch (command.burnType) {
              case BurnType.Up:
                givenUpValue = amountDana;
                break;
              case BurnType.Down:
                givenDownValue = amountDana;
                break;
            }

            const tokenDana = await prisma.tokenDana.upsert({
              where: {
                tokenId: command.burnForId,
                version: token?.dana?.version
              },
              update: {
                version: {
                  increment: 1
                },
                danaBurnUp,
                danaBurnDown,
                danaBurnScore,
                danaReceivedUp,
                danaReceivedDown,
                danaReceivedScore
              },
              create: {
                danaBurnDown,
                danaBurnUp,
                danaBurnScore,
                danaReceivedUp,
                danaReceivedDown,
                danaReceivedScore,
                tokenId: command.burnForId,
                version: 0
              }
            });

            await this.tokenDanaCacheService.setTokenDana(command.burnForId, new TokenDana({ ...tokenDana }));

            this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
              command: command,
              txid: savedBurn.txid,
              amount: amountDana,
              givenDanaAddress: burnByAddress
            });
          });
        } else if (command.burnForType === BurnForType.Comment) {
          const comment = await this.prisma.comment.findFirst({
            where: {
              id: command.burnForId
            },
            include: {
              commentAccount: true,
              commentable: {
                include: {
                  post: {
                    include: {
                      page: {
                        include: { pageAccount: true }
                      },
                      account: true
                    }
                  }
                }
              }
            }
          });

          let danaBurnUp = comment?.danaBurnUp ?? 0;
          let danaBurnDown = comment?.danaBurnDown ?? 0;

          if (command.burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + amountDana;
          } else {
            danaBurnDown = danaBurnDown + amountDana;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;

          await this.prisma.comment.update({
            where: {
              id: command.burnForId
            },
            data: {
              danaBurnDown,
              danaBurnUp,
              danaBurnScore
            }
          });

          const burnByAddress = accountAddress;

          this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
            command: command,
            txid: savedBurn.txid,
            amount: amountDana,
            givenDanaAddress: burnByAddress,
            receivedDanaAddress: comment?.commentAccount?.address
          });

          //prepare notification
          if (comment?.commentable?.post) {
            const postComment = comment.commentable.post;
            const pagePost = postComment?.page;

            //If have page => Notif for commentAccount withoutFee, notif for pageAccount withFee.
            const additionalData = {
              senderName: sender.name,
              senderAddress: sender.address,
              senderAvatar: avatarUrl,
              pageName: pagePost && pagePost.name,
              burnType: command.burnType == BurnType.Up ? 'upvoted' : 'downvoted',
              burnForType: burnForTypeString.toLowerCase(),
              xpiBurn: amountDana,
              xpiFee: fee,
              coin: coinInfo[coinBurned].ticker
            };
            if (pagePost) {
              createNotifBurnAndTip = {
                senderId: sender.id,
                recipientId: pagePost?.pageAccountId,
                notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_PAGE,
                level: NotificationLevel.INFO,
                url: '/post/' + postComment.id,
                additionalData
              };
              createNotifBurnWithoutTip = {
                senderId: sender.id,
                recipientId: comment.commentAccountId,
                notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_WITHOUT_FEE,
                level: NotificationLevel.INFO,
                url: '/post/' + postComment.id,
                additionalData
              };
            } else {
              //Otherwise notif for postAccount withFee
              createNotifBurnAndTip = {
                senderId: sender.id,
                recipientId: postComment.accountId,
                notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_COMMENT_ACCOUNT,
                level: NotificationLevel.INFO,
                url: '/post/' + postComment?.id,
                additionalData
              };
            }
          }
        } else if (command.burnForType === BurnForType.Page) {
          const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);
          const updatePageDana = this.pageDanaQueue.add(PAGE_DANA_QUEUE, {
            command: command,
            amount: amountDana,
            pageId: command.burnForId
          });

          const updateAccountDana = this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
            command: command,
            txid: savedBurn.txid,
            amount: amountDana,
            givenDanaAddress: burnByAddress,
            receivedDanaAddress: null
          });

          Promise.all([updatePageDana, updateAccountDana]);

          //prepare notification
          //notif for pageAccount
          const page = await this.prisma.page.findFirst({
            where: { id: command.burnForId }
          });
          const additionalData = {
            senderName: sender.name,
            senderAddress: sender.address,
            senderAvatar: avatarUrl,
            pageName: page?.name,
            burnType: command.burnType == BurnType.Up ? 'upvoted' : 'downvoted',
            burnForType: burnForTypeString.toLowerCase(),
            xpiBurn: amountDana,
            xpiFee: fee,
            coin: coinInfo[coinBurned].ticker
          };
          createNotifBurnAndTip = {
            senderId: sender.id,
            recipientId: page?.pageAccountId,
            notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_ACCOUNT_OR_PAGE,
            level: NotificationLevel.INFO,
            url: '/page/' + page?.id,
            additionalData
          };
        } else if (command.burnForType === BurnForType.Account) {
          const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);
          const burnToAddress = this.convertBurnedByToAddress(command.burnForId);

          await this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
            command: command,
            txid: savedBurn.txid,
            amount: amountDana,
            givenDanaAddress: burnByAddress,
            receivedDanaAddress: burnToAddress
          });

          //prepare notification
          //notif for account
          const recipientAccount = await this.accountCacheService.getByAddress(burnToAddress);
          const additionalData = {
            senderName: sender.name,
            senderAddress: sender.address,
            senderAvatar: avatarUrl,
            burnType: command.burnType == BurnType.Up ? 'upvoted' : 'downvoted',
            burnForType: burnForTypeString.toLowerCase(),
            xpiBurn: amountDana,
            xpiFee: fee,
            coin: coinInfo[coinBurned].ticker
          };
          createNotifBurnAndTip = {
            senderId: sender.id,
            recipientId: recipientAccount?.id,
            notificationTypeId: NOTIFICATION_TYPES.RECEIVE_BURN_ACCOUNT_OR_PAGE,
            level: NotificationLevel.INFO,
            url: '/profile/' + recipientAccount?.address,
            additionalData
          };
        }
      }

      //make notification
      createNotifBurnAndTip !== null &&
        createNotifBurnAndTip.senderId !== createNotifBurnAndTip.recipientId &&
        (await this.notificationService.saveAndDispatchNotification(createNotifBurnAndTip));

      createNotifBurnWithoutTip !== null &&
        createNotifBurnWithoutTip.senderId !== createNotifBurnWithoutTip.recipientId &&
        (await this.notificationService.saveAndDispatchNotification(createNotifBurnWithoutTip));

      //make top account dana weekly and monthly
      //just dana giving for now
      const now = moment().utc();
      const numberWeek = now.week();
      const numberMonth = now.month() + 1;
      const numberYear = now.year();

      const weekKey = template(BurnController.topAccountWeekKey, {
        weekNumber: numberWeek,
        year: numberYear
      });
      const monthKey = template(BurnController.topAccountMonthKey, {
        monthNumber: numberMonth,
        year: numberYear
      });

      await this.redis.zincrby(weekKey, amountDana, sender.id);
      await this.redis.zincrby(monthKey, amountDana, sender.id);

      const result: Burn = {
        ...savedBurn,
        burnType: savedBurn.burnType ? BurnType.Up : BurnType.Down,
        burnedBy: savedBurn.burnedBy.toString('hex')
      };

      return result;
    } catch (err: any) {
      if (err instanceof VError) {
        throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        const unableToUpdateLixi = err?.message || this.i18n.t('burn.messages.unableToBurn');
        const error = new VError.WError(err as Error, unableToUpdateLixi);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
