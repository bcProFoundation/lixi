import { COIN } from '@bcpros/lixi-models';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ChronikClient } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { INDEX_BLOCK_QUEUE } from './dana.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class DanaIndexXECService implements OnModuleInit {
  private logger: Logger = new Logger(DanaIndexXECService.name);

  private keyIndexHighestBlockData = 'items:index-block-highest:XEC';

  constructor(
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue(INDEX_BLOCK_QUEUE) private indexBlockQueue: Queue
  ) {}

  async onModuleInit() {
    //clear queue before run
    await this.indexBlockQueue.drain();

    const { tipHeight: highest } = await this.chronikXEC.blockchainInfo();
    const currentHeightStr = await this.redis.get(this.keyIndexHighestBlockData);
    const currentHeightNumber = currentHeightStr ? Number(currentHeightStr) : 0; //xec start with 0

    //run to highest
    const stepToFetch = 350;
    for (let i = currentHeightNumber; i <= highest; i += stepToFetch) {
      const indexToBlock = i + stepToFetch > highest ? highest : i + stepToFetch;
      await this.indexBlockQueue.add(INDEX_BLOCK_QUEUE, {
        startIndex: i,
        endIndex: indexToBlock,
        coin: COIN.XEC,
        isLastJob: false
      });
    }
    //add to last job
    await this.indexBlockQueue.add(INDEX_BLOCK_QUEUE, {
      startIndex: highest,
      endIndex: 0,
      coin: COIN.XEC,
      isLastJob: true
    });
  }
}
