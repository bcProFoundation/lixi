import {
  Account,
  BoostFee,
  BoostType,
  COIN,
  CreateBoostInput,
  PostBoost,
  coinInfo,
  getTickerText
} from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { ChronikClient, ChronikClientNode } from 'chronik-client';
import { InjectChronikClient, InjectChronikClientNode } from 'nestjs-chronik';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PostBoostCacheService } from '../page/post-boost-cache.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BOOST_FANOUT_QUEUE } from './boost.constants';
import { fromCoinToSatoshis } from 'src/utils/cashMethods';
import BigNumber from 'bignumber.js';
import { InjectBot } from 'nestjs-telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram/telegram-bot.constants';
import { Context, Telegraf } from 'telegraf';
import { BOT } from 'src/utils/bot.constants';
import { format } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { COIN_OTHERS } from '../escrow/escrow.contants';
import { processTextOrderLimit } from 'src/utils/escrow/offer';

@SkipThrottle()
@Resolver(() => BoostFee)
@UseFilters(GqlHttpExceptionFilter)
export class BoostFeeResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    @I18n() private i18n: I18nService,
    @InjectQueue(BOOST_FANOUT_QUEUE) private boostFanoutQueue: Queue,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClientNode('xec') private chronikXEC: ChronikClientNode,
    private readonly postBoostCacheService: PostBoostCacheService,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>
  ) {}

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => BoostFee)
  async createBoost(@AccountEntity() account: Account, @Args('data') data: CreateBoostInput) {
    const { boostForId, boostForType, boostType, boostedBy, boostedValue, txHex } = data;

    const savedBoost = await this.prisma.$transaction(
      async prisma => {
        const broadcastResponse = await this.chronikXEC.broadcastTx(txHex).catch(async err => {
          throw new Error('Error when broadcast XEC');
        });
        const { txid } = broadcastResponse;

        //check value of boost and value broadcast
        const detailTx = await this.chronikXEC.tx(txid);

        const firstTxOutput = detailTx.outputs[0];
        const boostedValueSats = fromCoinToSatoshis(BigNumber(boostedValue), coinInfo[COIN.XEC].cashDecimals);
        if (!firstTxOutput || !boostedValueSats || !new BigNumber(firstTxOutput.value).isEqualTo(boostedValueSats))
          return null;

        const prevTxIdExist = await this.prisma.boostFee.findFirst({
          where: {
            txid: txid
          }
        });

        if (prevTxIdExist) {
          throw new Error('Wallet not update');
        }

        //save boost
        const createdBoost = await this.prisma.boostFee.create({
          data: {
            txid: txid,
            boostedByHash: boostedBy,
            boostForId: boostForId,
            boostForType: boostForType,
            boostType: boostType ? true : false,
            boostedValue: boostedValue
          }
        });

        return createdBoost;
      },
      {
        timeout: 10000
      }
    );

    if (savedBoost) {
      const post = await this.prisma.post.findFirst({
        where: {
          id: boostForId
        },
        include: {
          boostScore: true,
          offer: {
            include: {
              location: true,
              country: true,
              paymentMethods: true
            }
          }
        }
      });

      //update boost score
      let boostUp = post?.boostScore?.boostUp ?? 0;
      let boostDown = post?.boostScore?.boostDown ?? 0;
      if (boostType === BoostType.Up) {
        boostUp += boostedValue;
      } else {
        boostDown += boostedValue;
      }
      const boostScore = boostUp - boostDown;

      // @todo: This is incorrect handle
      // not prepare for the conflict update
      // later we should move to each processor to read then update and retry if need
      await this.prisma.$transaction(async prisma => {
        const newPostBoost = await this.prisma.postBoostScore.upsert({
          where: {
            postId: boostForId,
            version: post?.boostScore?.version
          },
          update: {
            version: {
              increment: 1
            },
            boostUp,
            boostDown,
            boostScore
          },
          create: {
            boostUp,
            boostDown,
            boostScore,
            boostReceivedDown: 0,
            boostReceivedScore: 0,
            boostReceivedUp: 0,
            version: 0,
            postId: boostForId
          }
        });

        //add cache
        await this.postBoostCacheService.setPostBoost(boostForId, new PostBoost({ ...newPostBoost }));
      });

      //update boost score
      await this.boostFanoutQueue.add(BOOST_FANOUT_QUEUE, {
        boost: { ...savedBoost },
        post: post
      });

      const offerBoosted = await this.prisma.post.findFirst({
        where: { id: boostForId },
        include: { offer: { include: { location: true, country: true, paymentMethods: true } } }
      });

      //notify to channel
      if (offerBoosted) {
        const channelId = this.configService.get<string>('TELEGRAM_CHANNEL_ID') ?? -1002199386416;
        const link =
          this.configService.get('TELEGRAM_MINI_APP_ENABLED') === 'true'
            ? `https://t.me/${this.configService.get('TELEGRAM_LOCAL_ECASH_BOT_NAME')}?startapp=offer__detail__${boostForId}`
            : `${this.configService.get('LOCAL_ECASH_URL')}/offer-detail?id=${boostForId}`;

        const paymentMethodIds = offerBoosted.offer?.paymentMethods.map(item => item.paymentMethodId);
        const paymenMethod = await this.prisma.paymentMethod.findMany({
          where: {
            id: { in: paymentMethodIds }
          },
          select: {
            name: true
          }
        });
        const paymentMethodString = paymenMethod.map(item => item.name).join(' - ');
        const locationOfOffer = offerBoosted.offer?.location;
        let strLocation =
          locationOfOffer &&
          `${[locationOfOffer?.cityAscii, locationOfOffer?.adminNameAscii, locationOfOffer?.country].filter(Boolean).join(', ')}`;
        if (offerBoosted.offer?.country) {
          strLocation = `${offerBoosted.offer?.country.name}`;
        }
        //message - orderlimit - price - paymentMethod - location - link
        const offerData = offerBoosted?.offer;
        const ticker = getTickerText(
          offerData?.localCurrency,
          offerData?.coinPayment,
          offerData?.coinOthers,
          offerData?.priceCoinOthers
        );

        const orderLimitText = processTextOrderLimit(
          offerBoosted?.offer?.orderLimitMin,
          offerBoosted?.offer?.orderLimitMax,
          ticker
        );
        const formatReplied =
          strLocation && strLocation !== ''
            ? format(
                BOT.MESSAGE.BOOST_NOTIFY,
                `${offerBoosted?.offer?.message}`,
                orderLimitText,
                paymentMethodString,
                strLocation,
                link
              )
            : format(
                BOT.MESSAGE.BOOST_NOTIFY_WITHOUT_LOCATION,
                `${offerBoosted?.offer?.message}`,
                orderLimitText,
                paymentMethodString,
                link
              );

        if (boostType === BoostType.Up) {
          await this.bot.telegram
            .sendMessage(channelId, formatReplied, {
              parse_mode: 'Markdown'
            })
            .catch(e => {
              console.log(e);
            });
        }
      }

      const result = {
        ...savedBoost,
        boostType: savedBoost.boostType ? BoostType.Up : BoostType.Down
      };
      return result;
    }
    return null;
  }
}
