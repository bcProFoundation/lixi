import { COIN, issuanceXEC } from '@bcpros/lixi-models';
import { encode } from '@msgpack/msgpack';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Block, ChronikClient } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { template } from 'src/utils/stringTemplate';
import { DanaWsService } from './dana-ws.service';
import { KeyIndexCurrentHeight } from 'src/utils/constants';

@Injectable()
export class DanaIndexXECService implements OnModuleInit {
  private logger: Logger = new Logger(DanaIndexXECService.name);

  private keyIndexHighestBlockData = 'items:index-block-highest:XEC';
  private keyIndexToBlock = 'items:index-to-block:XEC';

  constructor(
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    @InjectRedis() private readonly redis: Redis,
    private readonly danaWsService: DanaWsService
  ) {}

  async onModuleInit() {
    //XEC
    const { tipHeight: highest } = await this.chronikXEC.blockchainInfo();
    const indexToHeightStr = await this.redis.get(this.keyIndexToBlock);
    const indexToHeightNum = indexToHeightStr ? Number(indexToHeightStr) : 0;

    //just index the first time
    if (indexToHeightNum === 0) {
      await this.redis.set(this.keyIndexToBlock, highest);
    }

    const currentHeightStr = await this.redis.get(this.keyIndexHighestBlockData);
    const currentHeightNumber = currentHeightStr ? Number(currentHeightStr) : 0; //XEC start with 0

    //run to highest
    for (let i = currentHeightNumber; i <= highest; i++) {
      await this.danaWsService.handleNewBlock(i, COIN.XEC, 0);
      await this.redis.set(this.keyIndexHighestBlockData, i);
    }
  }
}
