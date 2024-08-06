import { Account, BoostFee, BoostType, COIN, CreateBoostInput, PostBoost, coinInfo } from '@bcpros/lixi-models';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { AccountEntity } from 'src/decorators';
import { ChronikClient } from 'chronik-client';
import { InjectChronikClient } from 'nestjs-chronik';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PostBoostCacheService } from '../page/post-boost-cache.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BOOST_FANOUT_QUEUE } from './boost.constants';
import { fromCoinToSatoshis } from 'src/utils/cashMethods';
import BigNumber from 'bignumber.js';

@SkipThrottle()
@Resolver(() => BoostFee)
@UseFilters(GqlHttpExceptionFilter)
export class BoostFeeResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    @InjectQueue(BOOST_FANOUT_QUEUE) private boostFanoutQueue: Queue,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    private readonly postBoostCacheService: PostBoostCacheService
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
        if (!firstTxOutput || !boostedValueSats || firstTxOutput.value !== boostedValueSats.toString()) return null;

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
          boostScore: true
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

      return savedBoost;
    }
    return null;
  }
}
