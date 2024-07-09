import { COIN } from '@bcpros/lixi-models';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ChronikClient, SubscribeMsg, Tx } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
const AsyncLock = require('async-lock');

@Injectable()
export class LixiHandleWsService implements OnModuleInit {
  private logger: Logger = new Logger(LixiHandleWsService.name);

  private blockConnectedLock = new AsyncLock();

  constructor(
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectRedis() private readonly redis: Redis
  ) { }

  async onModuleInit() {
    //ws for xpi
    const ws = this.chronikXPI.ws({
      onMessage: async (msg: SubscribeMsg) => {
        const { type } = msg;
        if (type === 'BlockConnected') {
          //add new block
        }
      },
      onReconnect: e => {
        // Fired before a reconnect attempt is made:
        this.logger.log('Reconnecting websocket, disconnection cause: ');
      },
      onConnect: e => {
        this.logger.log(`Chronik websocket connected`);
      },
      onError: e => {
        this.logger.log('error', e);
      }
    });
    await ws.waitForOpen();
    ws.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');


    this.logger.log(`The module has been initialized.`);
  }

  async parseWebsocketMessage(wsMsg: SubscribeMsg) {

    // determine message type 
    // type can be AddedToMempool, BlockConnected, or Confirmed
    const { type } = wsMsg;
    switch (type) {
      case 'BlockConnected': {
        return this.blockConnectedLock
          .acquire('handleBlockConnected', async () => {
            return await this.handleBlockConnected(
              wsMsg.blockHash,
            );
          });
      }
      case 'AddedToMempool':
      case 'RemovedFromMempool':
      case 'Confirmed':
        break;
      default:
    }
  }

  async handleBlockConnected(blockHash: string) {
    let newBlockInfo;
    return newBlockInfo;

  }

  async parseTxForPendingHandles(txDetails: Tx) {

  }

  async handleMultipleBlock(startBlock: number, endBlock: number, coin = COIN.XPI) {
  }
}
