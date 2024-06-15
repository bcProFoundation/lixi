import { COIN, coinInfo, DanaRate, GHPerDana, issuanceXEC, ratioHash256 } from '@bcpros/lixi-models';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BlockInfo, ChronikClient, SubscribeMsg } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { template } from 'src/utils/stringTemplate';
import { KeyCurrentHeight } from './dana.constants';
import { fromSatoshisToCoin } from 'src/utils/cashMethods';

@Injectable()
export class DanaWsService implements OnModuleInit {
  private logger: Logger = new Logger(DanaWsService.name);
  private keyInfoBlockPrefix = 'items:blocks:{{coin}}:item-data';
  private keyInfoConvertPrefix = 'items:convert-dana:{{coin}}:item-data';

  private keyHighestBlockData = 'items:block-highest:{{coin}}';
  private keyHighestConvertData = 'items:convert-dana-highest:{{coin}}';
  private keyAdjustDana = 'items:dana-rate-adjust';

  private keyIndexHighestBlockData = 'items:index-block-highest:{{coin}}';

  constructor(
    @InjectChronikClient('xec') private chronikXEC: ChronikClient,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async onModuleInit() {
    //ws for xpi
    const ws = this.chronikXPI.ws({
      onMessage: async (msg: SubscribeMsg) => {
        const { type } = msg;
        if (type === 'BlockConnected') {
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XPI });
          const highestXPI = (await this.chronikXPI.blockchainInfo()).tipHeight;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '1');

          if (highestXPI < currentIndexHighest + 10) {
            this.handleNewBlock(msg.blockHash, COIN.XPI);
            this.redis.set(keyHighestBlockCoin, highestXPI);
          }
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

    //ws for xec
    const wsXEC = this.chronikXEC.ws({
      onMessage: async (msg: SubscribeMsg) => {
        const { type } = msg;
        if (type === 'BlockConnected') {
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XEC });
          const highestXEC = (await this.chronikXPI.blockchainInfo()).tipHeight;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '0');

          if (highestXEC < currentIndexHighest + 10) {
            this.handleNewBlock(msg.blockHash, COIN.XEC);
            this.redis.set(keyHighestBlockCoin, highestXEC);
          }
        }
      },
      onReconnect: e => {
        // Fired before a reconnect attempt is made:
        this.logger.log('XEC Reconnecting websocket, disconnection cause: ');
      },
      onConnect: e => {
        this.logger.log(`XEC Chronik websocket connected`);
      },
      onError: e => {
        this.logger.log('XEC error', e);
      }
    });
    await wsXEC.waitForOpen();
    wsXEC.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');

    this.logger.log(`The module has been initialized.`);
  }

  async handleNewBlock(blockHash: string | number, coin = COIN.XPI) {
    let newBlockInfo;
    switch (coin) {
      case COIN.XPI:
        newBlockInfo = (await this.chronikXPI.block(blockHash)).blockInfo;
        break;
      case COIN.XEC:
        newBlockInfo = (await this.chronikXEC.block(blockHash)).blockInfo;
        break;
    }

    //write into redis
    const keyInfoBlockCoin = template(this.keyInfoBlockPrefix, { coin });
    const keyInfoHighestBlock = template(this.keyHighestBlockData, { coin });

    this.redis.hset(keyInfoBlockCoin, newBlockInfo.height, Buffer.from(encode(newBlockInfo)));
    this.redis.hset(keyInfoHighestBlock, KeyCurrentHeight, Buffer.from(encode(newBlockInfo)));

    //calculate difficulty from nbits:
    const nBitsHex = newBlockInfo.nBits.toString(16);

    // split value to exponent (1 byte) and coefficient (3 byte)
    const exponent = parseInt(nBitsHex.slice(0, 2), 16);
    const coefficient = parseInt(nBitsHex.slice(2), 16);

    // cal target (coefficient * 256^(exponent - 3))
    const target = coefficient * Math.pow(256, exponent - 3);
    const targetMax = 0xffff * Math.pow(256, 0x1d - 3);

    const difficulty = targetMax / target;

    // cal hashrate (diff * 2^32 / blockTime)
    const hashrate = (difficulty * Math.pow(2, 32)) / coinInfo[coin].blockTime;
    const GHashratePerSecond = hashrate * Math.pow(10, -9);
    const GHashratePerBlockTime = GHashratePerSecond * coinInfo[coin].blockTime;

    //calculate insurance
    //xpi: 260 * (log2(difficulty / 16) + 1)
    //xec,... have fix issuance
    const issuance =
      coin === COIN.XPI ? 260 * (Math.log2(difficulty / 16) + 1) : Number(newBlockInfo.sumCoinbaseOutputSats);

    //calculate GH/coin (hash / issuance)
    const GHPerCoin = GHashratePerBlockTime / issuance;

    //convert dana to coin (xpi, xec,...)
    const date = new Date();
    const today = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const adjustGHPerDana = await this.redis.hget(this.keyAdjustDana, today);
    const convertAdjustGHPerDana = adjustGHPerDana ? Number(adjustGHPerDana) : GHPerDana;
    const adjustGHPerDanaByCoin = coin === COIN.XPI ? convertAdjustGHPerDana : convertAdjustGHPerDana * ratioHash256;
    const coinPerDana = adjustGHPerDanaByCoin / GHPerCoin;

    //write result into redis
    const keyInfoConvertDana = template(this.keyInfoConvertPrefix, { coin });
    const keyInfoHighestConvertDana = template(this.keyHighestConvertData, { coin });

    const savedConvertedRate: DanaRate = {
      blockHeight: newBlockInfo.height,
      difficulty,
      GHPerSecond: GHashratePerSecond,
      GHPerBlockTime: GHashratePerBlockTime,
      issuance: issuance,
      GHPerDana: adjustGHPerDanaByCoin,
      coinPerDana
    };

    this.redis.hset(keyInfoConvertDana, newBlockInfo.height, Buffer.from(encode(savedConvertedRate)));
    this.redis.hset(keyInfoHighestConvertDana, KeyCurrentHeight, Buffer.from(encode(savedConvertedRate)));
  }

  async handleMutipleBlock(startBlock: number, endBlock: number, coin = COIN.XPI) {
    let newBlockInfos: BlockInfo[];
    switch (coin) {
      case COIN.XPI:
        newBlockInfos = await this.chronikXPI.blocks(startBlock, endBlock);
        break;
      case COIN.XEC:
        newBlockInfos = await this.chronikXEC.blocks(startBlock, endBlock);
        break;
    }
    const blockMap = new Map();
    const hashRateMap = new Map();

    for (let i = 0; i < newBlockInfos.length; i++) {
      const currentBlock = newBlockInfos[i];
      //calculate difficulty from nbits:
      const nBitsHex = currentBlock.nBits.toString(16);

      // split value to exponent (1 byte) and coefficient (3 byte)
      const exponent = parseInt(nBitsHex.slice(0, 2), 16);
      const coefficient = parseInt(nBitsHex.slice(2), 16);

      // cal target (coefficient * 256^(exponent - 3))
      const target = coefficient * Math.pow(256, exponent - 3);
      const targetMax = 0xffff * Math.pow(256, 0x1d - 3);

      const difficulty = targetMax / target;

      // cal hashrate (diff * 2^32 / blockTime)
      const hashrate = (difficulty * Math.pow(2, 32)) / coinInfo[coin].blockTime;
      const GHashratePerSecond = hashrate * Math.pow(10, -9);
      const GHashratePerBlockTime = GHashratePerSecond * coinInfo[coin].blockTime;

      //calculate insurance
      //xpi: 260 * (log2(difficulty / 16) + 1)
      //xec,... have fix issuance
      const issuance =
        coin === COIN.XPI
          ? 260 * (Math.log2(difficulty / 16) + 1)
          : parseInt(
              fromSatoshisToCoin(currentBlock.sumCoinbaseOutputSats, coinInfo[COIN.XEC].cashDecimals).toString()
            );

      //calculate GH/coin (hash / issuance)
      const GHPerCoin = GHashratePerBlockTime / issuance;

      //convert dana to coin (xpi, xec,...)
      const date = new Date();
      const today = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      const adjustGHPerDana = await this.redis.hget(this.keyAdjustDana, today);
      const convertAdjustGHPerDana = adjustGHPerDana ? Number(adjustGHPerDana) : GHPerDana;
      const adjustGHPerDanaByCoin = coin === COIN.XPI ? convertAdjustGHPerDana : convertAdjustGHPerDana * ratioHash256;
      const coinPerDana = adjustGHPerDanaByCoin / GHPerCoin;

      const savedConvertedRate: DanaRate = {
        blockHeight: currentBlock.height,
        difficulty,
        GHPerSecond: GHashratePerSecond,
        GHPerBlockTime: GHashratePerBlockTime,
        issuance: issuance,
        GHPerDana: adjustGHPerDanaByCoin,
        coinPerDana
      };

      blockMap.set(currentBlock.height, Buffer.from(encode(currentBlock)));
      hashRateMap.set(currentBlock.height, Buffer.from(encode(savedConvertedRate)));
    }

    //write result into redis
    const keyInfoBlockCoin = template(this.keyInfoBlockPrefix, { coin });
    const keyInfoHighestBlock = template(this.keyHighestBlockData, { coin });
    const keyInfoConvertDana = template(this.keyInfoConvertPrefix, { coin });
    const keyInfoHighestConvertDana = template(this.keyHighestConvertData, { coin });

    Promise.all([
      this.redis.hmset(keyInfoBlockCoin, blockMap),
      this.redis.hset(keyInfoHighestBlock, KeyCurrentHeight, blockMap.get(endBlock)),
      this.redis.hmset(keyInfoConvertDana, hashRateMap),
      this.redis.hset(keyInfoHighestConvertDana, KeyCurrentHeight, hashRateMap.get(endBlock))
    ]);
  }
}
