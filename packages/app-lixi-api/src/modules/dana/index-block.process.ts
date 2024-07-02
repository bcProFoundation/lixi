import * as _ from 'lodash';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { template } from 'src/utils/stringTemplate';
import { INDEX_BLOCK_QUEUE } from './dana.constants';
import { DanaWsService } from './dana-ws.service';
import { InjectChronikClient } from 'nestjs-chronik';
import { ChronikClient } from 'chronik-client';
import { COIN } from '@bcpros/lixi-models';

@Injectable()
@Processor(INDEX_BLOCK_QUEUE)
export class IndexBlockProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);
  private keyIndexHighestBlockData = 'items:index-block-highest:{{coin}}';

  constructor(
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectRedis() private readonly redis: Redis,
    private readonly danaWsService: DanaWsService
  ) {
    super();
  }

  public async process(
    job: Job<{ startIndex: number; endIndex: number; coin: COIN; isLastJob: boolean }>
  ): Promise<boolean> {
    const { startIndex, endIndex, coin, isLastJob } = job.data;
    const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin });

    //fetch highest and check
    if (isLastJob) {
      switch (coin) {
        case COIN.XPI:
          const { tipHeight: highestXPI } = await this.chronikXPI.blockchainInfo();
          //Index new block generated when we index from first
          if (highestXPI != startIndex) {
            await this.danaWsService.handleMultipleBlock(startIndex, highestXPI, coin);
            await this.redis.set(keyHighestBlockCoin, highestXPI);
          }
          break;
        case COIN.XEC:
          const { tipHeight: highestXEC } = await this.chronikXEC.blockchainInfo();
          //Index new block generated when we index from first
          if (highestXEC != startIndex) {
            await this.danaWsService.handleMultipleBlock(startIndex, highestXEC, coin);
            await this.redis.set(keyHighestBlockCoin, highestXEC);
          }
          break;
      }
    } else {
      await this.danaWsService.handleMultipleBlock(startIndex, endIndex, coin);
      await this.redis.set(keyHighestBlockCoin, endIndex);
    }

    return true;
  }
}
