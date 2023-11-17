import {
  Burn,
  BurnCommand,
  BurnForType,
  BurnType,
  CommentType,
  PostDana,
  TRANSLATION_REQUIRE_AMOUNT,
  TokenDana
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
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';
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

@SkipThrottle()
@Controller('burn')
export class BurnController {
  private logger: Logger = new Logger(BurnController.name);
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    @Inject(XPIJS) private XPI: BCHJS,
    @InjectQueue(BURN_FANOUT_QUEUE) private burnFanoutQueue: Queue,
    @InjectQueue(ACCOUNT_DANA_QUEUE) private accountDanaQueue: Queue,
    @InjectQueue(PAGE_DANA_QUEUE) private pageDanaQueue: Queue,
    private translateService: TranslateService,
    private readonly accountCacheService: AccountCacheService,
    private readonly postDanaCacheService: PostDanaCacheService,
    private readonly tokenDanaCacheService: TokenDanaCacheService
  ) {}

  private convertBurnedByToAddress(burnedBy: string): string {
    const legacyAddress = this.XPI.Address.hash160ToLegacy(burnedBy);

    const publicAddress = this.XPI.Address.toXAddress(legacyAddress);

    return publicAddress;
  }

  @Post()
  async burn(@Body() command: BurnCommand): Promise<Burn> {
    try {
      const value = parseFloat(command.burnValue);
      const savedBurn = await this.prisma.$transaction(async prisma => {
        const broadcastResponse = await this.chronik.broadcastTx(command.txHex).catch(async err => {
          const updatingWalletFund = await this.i18n.t('burn.messages.updatingWalletFund');
          throw new VError(updatingWalletFund);
        });
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

      if (savedBurn) {
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
          const xpiValue = value;

          if (command.burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + xpiValue;
            danaReceivedUp = danaReceivedUp + xpiValue;
          } else {
            danaBurnDown = danaBurnDown + xpiValue;
            danaReceivedDown = danaReceivedDown + xpiValue;
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

            const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);

            this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
              command: command,
              txid: savedBurn.txid,
              amount: xpiValue,
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
                totalPostsBurnUp = totalPostsBurnUp + xpiValue;
              } else {
                totalPostsBurnDown = totalPostsBurnDown + xpiValue;
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
                amount: xpiValue,
                pageId: post.pageId
              });
            });
          }

          if (postHashtags.length > 0) {
            const hashtagBurnValue = xpiValue / postHashtags.length;
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

          // Put burn result to fanout
          await this.burnFanoutQueue.add(BURN_FANOUT_QUEUE, {
            burn: savedBurn,
            post: post
          });
        } else if (command.burnForType === BurnForType.Token) {
          const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);
          const xpiValue = value;

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
            danaBurnUp = danaBurnUp + xpiValue;
          } else {
            danaBurnDown = danaBurnDown + xpiValue;
          }
          const danaBurnScore = danaBurnUp - danaBurnDown;
          const danaReceivedScore = danaReceivedUp - danaReceivedDown;

          await this.prisma.$transaction(async prisma => {
            let givenUpValue = 0.0;
            let givenDownValue = 0.0;

            switch (command.burnType) {
              case BurnType.Up:
                givenUpValue = xpiValue;
                break;
              case BurnType.Down:
                givenDownValue = xpiValue;
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
              amount: xpiValue,
              givenDanaAddress: burnByAddress
            });
          });
        } else if (command.burnForType === BurnForType.Comment) {
          const comment = await this.prisma.comment.findFirst({
            where: {
              id: command.burnForId
            },
            include: {
              commentAccount: true
            }
          });

          let danaBurnUp = comment?.danaBurnUp ?? 0;
          let danaBurnDown = comment?.danaBurnDown ?? 0;
          const xpiValue = value;

          if (command.burnType == BurnType.Up) {
            danaBurnUp = danaBurnUp + xpiValue;
          } else {
            danaBurnDown = danaBurnDown + xpiValue;
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

          const burnByAddress = this.convertBurnedByToAddress(command.burnedBy);

          this.accountDanaQueue.add(ACCOUNT_DANA_QUEUE, {
            command: command,
            txid: savedBurn.txid,
            amount: xpiValue,
            givenDanaAddress: burnByAddress,
            receivedDanaAddress: comment?.commentAccount?.address
          });
        }
      }

      // prepare data sender
      // const legacyAddress = this.XPI.Address.hash160ToLegacy(command.burnedBy);
      const accountAddress = this.convertBurnedByToAddress(command.burnedBy);
      const sender = await this.prisma.account.findFirst({
        where: {
          address: accountAddress
        },
        include: {
          avatar: {
            include: {
              upload: true
            }
          }
        }
      });
      if (!sender) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      //Need to remove BurnForType.Worship becasue we dont have notification YET on lotus-temple
      //TODO: Remove line below to handle BurnForType.Worship notification
      if (command.burnForType !== BurnForType.Token && command.burnForType !== BurnForType.Worship) {
        // prepare data recipient
        let commentAccountId;
        let commentPostId;
        let commentAccount;
        if (command.burnForType == BurnForType.Comment) {
          const comment = await this.prisma.comment.findFirst({
            where: { id: command.burnForId },
            include: {
              commentable: true
            }
          });

          if (comment?.commentable?.type === CommentType.POST) {
            const post = await this.prisma.post.findFirst({
              where: { commentableId: comment.commentableId }
            });
            commentPostId = post ? post.id : undefined;
          }

          commentAccountId = comment?.commentAccountId;

          commentAccount = await this.accountCacheService.getById(_.toSafeInteger(commentAccountId));
        }

        const postId = command.burnForType == BurnForType.Comment ? commentPostId : command.burnForId;
        const post = await this.prisma.post.findFirst({
          where: { id: postId },
          include: {
            account: true,
            page: {
              include: {
                pageAccount: true
              }
            }
          }
        });

        if (!post) {
          const accountNotExistMessage = await this.i18n.t('post.messages.postNotExist');
          throw new VError(accountNotExistMessage);
        }

        const recipientPostAccount = await this.accountCacheService.getById(_.toSafeInteger(post?.accountId));
        if (!recipientPostAccount) {
          const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
          throw new VError(accountNotExistMessage);
        }

        // get burnForType key
        const typeValuesArr = Object.values(BurnForType);
        const burnForTypeString =
          Object.keys(BurnForType)[typeValuesArr.indexOf(command.burnForType as unknown as BurnForType)];

        // BurnValue + tip + fee
        let fee = Number(command.burnValue) * 0.04;

        // create Notifications Burn
        let url;
        if (sender.avatar) {
          const { upload } = sender.avatar;
          const cfUrl = `${process.env.CF_IMAGES_DELIVERY_URL}/${process.env.CF_ACCOUNT_HASH}/${upload.cfImageId}/public`;
          url = upload.cfImageId ? cfUrl : upload.url;
        }

        const createNotifBurnAndTip = {
          senderId: sender.id,
          recipientId: post.page ? post.page.pageAccountId : (post?.accountId as number),
          notificationTypeId: post.page
            ? NOTIFICATION_TYPES.RECEIVE_BURN_PAGE
            : command.burnForType == BurnForType.Comment
            ? NOTIFICATION_TYPES.RECEIVE_BURN_COMMENT_ACCOUNT
            : NOTIFICATION_TYPES.RECEIVE_BURN_ACCOUNT,
          level: NotificationLevel.INFO,
          url:
            command.burnForType == BurnForType.Comment
              ? `/post/${post.id}?comment=${command.burnForId}`
              : '/post/' + post?.id,
          additionalData: {
            senderName: sender.name,
            senderAddress: sender.address,
            senderAvatar: url,
            pageName: post.page && post.page.name,
            burnType: command.burnType == BurnType.Up ? 'upvoted' : 'downvoted',
            burnForType: burnForTypeString.toLowerCase(),
            xpiBurn: command.burnValue,
            xpiFee: fee
          }
        };

        createNotifBurnAndTip.senderId !== createNotifBurnAndTip.recipientId &&
          (await this.notificationService.saveAndDispatchNotification(createNotifBurnAndTip));
      }

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
