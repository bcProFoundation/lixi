import { COIN, coinInfo, DanaRate, GHPerDanaStart, ratioHash256 } from '@bcpros/lixi-models';
import { encode } from '@msgpack/msgpack';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BlockInfo, BlockInfo_InNode, ChronikClient, ChronikClientNode, SubscribeMsg } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient, InjectChronikClientNode } from 'nestjs-chronik';
import { template } from 'src/utils/stringTemplate';
import { KeyCurrentAdjust, KeyCurrentHeight } from './dana.constants';
import { fromSatoshisToCoin } from 'src/utils/cashMethods';
import BigNumber from 'bignumber.js';

@Injectable()
export class DanaWsService implements OnModuleInit {
  private logger: Logger = new Logger(DanaWsService.name);
  private keyInfoBlockPrefix = 'items:blocks:{{coin}}:item-data';
  private keyInfoConvertPrefix = 'items:convert-dana:{{coin}}:item-data';
  private keyAdjustDana = 'items:dana-rate-adjust';

  private keyHighestBlockData = 'items:block-highest:{{coin}}';
  private keyHighestConvertData = 'items:convert-dana-highest:{{coin}}';
  private keyCurrentAdjustDana = 'items:dana-rate-adjust-current';
  private keyIndexHighestBlockData = 'items:index-block-highest:{{coin}}';

  constructor(
    @InjectChronikClientNode('xec') private chronikXEC: ChronikClientNode,
    @InjectChronikClient('xpi') private chronikXPI: ChronikClient,
    @InjectChronikClient('xrg') private chronikXRG: ChronikClient,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async onModuleInit() {
    //ws for xpi
    const ws = this.chronikXPI.ws({
      onMessage: async (msg: SubscribeMsg) => {
        const { type } = msg;
        if (type === 'BlockConnected') {
          //add new block
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XPI });
          const blockHighestInfo = (await this.chronikXPI.block(msg.blockHash)).blockInfo;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '1');

          if (blockHighestInfo.height < currentIndexHighest + 10) {
            this.handleNewBlock(blockHighestInfo, COIN.XPI);
            this.redis.set(keyHighestBlockCoin, blockHighestInfo.height);
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
    //we need to subscribe address to listen new block
    ws.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');

    //ws for xec
    const wsXEC = this.chronikXEC.ws({
      onMessage: async msg => {
        const { type } = msg;
        if (type === 'Block') {
          //add new block
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XEC });
          const blockHighestInfo = (await this.chronikXEC.block(msg.blockHash)).blockInfo;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '0');

          if (blockHighestInfo.height < currentIndexHighest + 10) {
            this.handleNewBlock(blockHighestInfo, COIN.XEC);
            this.redis.set(keyHighestBlockCoin, blockHighestInfo.height);
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
    //we need to subscribe address to listen new block
    wsXEC.subscribeToScript('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');

    //ws for ergon
    const wsXRG = this.chronikXRG.ws({
      onMessage: async (msg: SubscribeMsg) => {
        const { type } = msg;
        if (type === 'BlockConnected') {
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XRG });
          const blockHighestInfo = (await this.chronikXRG.block(msg.blockHash)).blockInfo;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '1'); //ergon start block at 1

          //index new block
          if (blockHighestInfo.height < currentIndexHighest + 10) {
            this.handleNewBlock(blockHighestInfo, COIN.XRG);
            this.redis.set(keyHighestBlockCoin, blockHighestInfo.height);
          }

          //adjust dana by blockTime
          if (Number.isInteger(blockHighestInfo.height / 144)) {
            const currentAdjustRateDana = this.calGHPerDanaByErgon(
              blockHighestInfo.nBits,
              Number(blockHighestInfo.sumCoinbaseOutputSats)
            );
            Promise.all([
              this.redis.hset(this.keyAdjustDana, blockHighestInfo.height, currentAdjustRateDana),
              this.redis.hset(this.keyCurrentAdjustDana, KeyCurrentAdjust, currentAdjustRateDana)
            ]);
          }
        }
      },
      onReconnect: e => {
        // Fired before a reconnect attempt is made:
        this.logger.log('XRG Reconnecting websocket, disconnection cause: ');
      },
      onConnect: e => {
        this.logger.log(`XRG Chronik websocket connected`);
      },
      onError: e => {
        this.logger.log('XRG error', e);
      }
    });
    await wsXRG.waitForOpen();
    //we need to subscribe address to listen new block
    wsXRG.subscribe('p2pkh', 'b8ae1c47effb58f72f7bca819fe7fc252f9e852e');

    this.logger.log(`The module has been initialized.`);
  }

  async handleNewBlock(newBlockInfo: BlockInfo | BlockInfo_InNode, coin = COIN.XPI) {
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
    const target = new BigNumber(coefficient * Math.pow(256, exponent - 3));
    const targetMax = new BigNumber(0xffff * Math.pow(256, 0x1d - 3));

    const difficulty = targetMax.div(target);

    // cal hashrate (diff * 2^32 / blockTime)
    const hashrate = difficulty.times(Math.pow(2, 32)).div(coinInfo[coin].blockTime);
    const GHashratePerSecond = hashrate.times(Math.pow(10, -9));
    const GHashratePerBlockTime = GHashratePerSecond.times(coinInfo[coin].blockTime);

    const issuance = parseFloat(
      fromSatoshisToCoin(newBlockInfo.sumCoinbaseOutputSats, coinInfo[coin].cashDecimals).toString()
    );

    //calculate GH/coin (hash / issuance)
    const GHPerCoin = GHashratePerBlockTime.div(issuance);

    //convert dana to coin (xpi, xec,...)
    const adjustGHPerDana = await this.redis.hget(this.keyCurrentAdjustDana, KeyCurrentAdjust);

    const convertAdjustGHPerDana = adjustGHPerDana ? Number(adjustGHPerDana) : GHPerDanaStart;
    const adjustGHPerDanaByCoin = coin === COIN.XPI ? convertAdjustGHPerDana / ratioHash256 : convertAdjustGHPerDana;
    const coinPerDana = new BigNumber(adjustGHPerDanaByCoin).div(GHPerCoin);

    //write result into redis
    const keyInfoConvertDana = template(this.keyInfoConvertPrefix, { coin });
    const keyInfoHighestConvertDana = template(this.keyHighestConvertData, { coin });

    const savedConvertedRate: DanaRate = {
      blockHeight: newBlockInfo.height,
      difficulty: parseFloat(difficulty.toString()),
      GHPerSecond: parseFloat(GHashratePerSecond.toString()),
      GHPerBlockTime: parseFloat(GHashratePerBlockTime.toString()),
      issuance: issuance,
      GHPerDana: adjustGHPerDanaByCoin,
      coinPerDana: parseFloat(coinPerDana.toString())
    };

    this.redis.hset(keyInfoConvertDana, newBlockInfo.height, Buffer.from(encode(savedConvertedRate)));
    this.redis.hset(keyInfoHighestConvertDana, KeyCurrentHeight, Buffer.from(encode(savedConvertedRate)));
  }

  async handleMultipleBlock(startBlock: number, endBlock: number, coin = COIN.XPI) {
    let newBlockInfos = [];
    switch (coin) {
      case COIN.XEC:
        newBlockInfos = await this.chronikXEC.blocks(startBlock, endBlock);
        break;
      case COIN.XRG:
        newBlockInfos = await this.chronikXRG.blocks(startBlock, endBlock);
        break;
      case COIN.XPI:
      default:
        newBlockInfos = await this.chronikXPI.blocks(startBlock, endBlock);
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
      const target = new BigNumber(coefficient * Math.pow(256, exponent - 3));
      const targetMax = new BigNumber(0xffff * Math.pow(256, 0x1d - 3));

      const difficulty = targetMax.div(target);

      // cal hashrate (diff * 2^32 / blockTime)
      const hashrate = difficulty.times(Math.pow(2, 32)).div(coinInfo[coin].blockTime);
      const GHashratePerSecond = hashrate.times(Math.pow(10, -9));
      const GHashratePerBlockTime = GHashratePerSecond.times(coinInfo[coin].blockTime);

      const issuance = parseFloat(
        fromSatoshisToCoin(currentBlock.sumCoinbaseOutputSats, coinInfo[coin].cashDecimals).toString()
      );

      //calculate GH/coin (hash / issuance)
      const GHPerCoin = GHashratePerBlockTime.div(issuance);

      //convert dana to coin (xpi, xec,...)
      const adjustGHPerDana = await this.redis.hget(this.keyCurrentAdjustDana, KeyCurrentAdjust);

      const convertAdjustGHPerDana = adjustGHPerDana ? Number(adjustGHPerDana) : GHPerDanaStart;
      const adjustGHPerDanaByCoin = coin === COIN.XPI ? convertAdjustGHPerDana / ratioHash256 : convertAdjustGHPerDana;
      const coinPerDana = new BigNumber(adjustGHPerDanaByCoin).div(GHPerCoin);

      const savedConvertedRate: DanaRate = {
        blockHeight: currentBlock.height,
        difficulty: parseFloat(difficulty.toString()),
        GHPerSecond: parseFloat(GHashratePerSecond.toString()),
        GHPerBlockTime: parseFloat(GHashratePerBlockTime.toString()),
        issuance: issuance,
        GHPerDana: adjustGHPerDanaByCoin,
        coinPerDana: parseFloat(coinPerDana.toString())
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

  private calGHPerDanaByErgon(nBits: number, issuanceSats: number): number {
    //calculate difficulty from nbits:
    const nBitsHex = nBits.toString(16);

    // split value to exponent (1 byte) and coefficient (3 byte)
    const exponent = parseInt(nBitsHex.slice(0, 2), 16);
    const coefficient = parseInt(nBitsHex.slice(2), 16);

    // cal target (coefficient * 256^(exponent - 3))
    const target = new BigNumber(coefficient * Math.pow(256, exponent - 3));
    const targetMax = new BigNumber(0xffff * Math.pow(256, 0x1d - 3));

    const difficulty = targetMax.div(target);

    // cal hashrate (diff * 2^32 / blockTime)
    const hashrate = difficulty.times(Math.pow(2, 32)).div(600); //block time of ergon is 600
    const GHashratePerSecond = hashrate.times(Math.pow(10, -9));
    const GHashratePerBlockTime = GHashratePerSecond.times(600);

    //calculate issuance
    const issuance = parseFloat(fromSatoshisToCoin(issuanceSats, 8).toString()); //cashDecimal in Ergon is 8

    //calculate GH/coin (hash / issuance)
    const GHPerCoin = GHashratePerBlockTime.div(issuance);

    const hash256PerDana = GHPerCoin.times(Math.pow(10, -7)); //1 Dana = 0.1mE. 1E = 1 000 000 mE

    return parseFloat(hash256PerDana.toString());
  }
}
