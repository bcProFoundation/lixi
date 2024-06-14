import { COIN, issuanceXEC } from '@bcpros/lixi-models';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger, OnModuleInit, Scope } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Block, ChronikClient } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { template } from 'src/utils/stringTemplate';
import { DanaWsService } from './dana-ws.service';
import { InjectQueue } from '@nestjs/bullmq';
import { INDEX_BLOCK_QUEUE, KeyCurrentHeight } from './dana.constants';
import { Queue } from 'bullmq';

@Injectable()
export class DanaIndexXPIService implements OnModuleInit {
  private logger: Logger = new Logger(DanaIndexXPIService.name);

  private keyIndexHighestBlockData = 'items:index-block-highest:XPI';

  constructor(
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue(INDEX_BLOCK_QUEUE) private indexBlockQueue: Queue
  ) {}

  async onModuleInit() {
    //clear queue before running
    await this.indexBlockQueue.drain(true);

    const { tipHeight: highest } = await this.chronikXPI.blockchainInfo();
    const currentHeightStr = await this.redis.get(this.keyIndexHighestBlockData);
    const currentHeightNumber = currentHeightStr ? Number(currentHeightStr) : 1; //xpi start with 1

    //run to highest
    const stepToFetch = 350;
    for (let i = currentHeightNumber; i <= highest; i += stepToFetch) {
      const indexToBlock = i + stepToFetch > highest ? highest : i + stepToFetch;
      await this.indexBlockQueue.add(INDEX_BLOCK_QUEUE, {
        startIndex: i,
        endIndex: indexToBlock,
        coin: COIN.XPI,
        isLastJob: false
      });
    }

    await this.indexBlockQueue.add(INDEX_BLOCK_QUEUE, {
      startIndex: highest,
      endIndex: 0,
      coin: COIN.XPI,
      isLastJob: true
    });
  }
}
