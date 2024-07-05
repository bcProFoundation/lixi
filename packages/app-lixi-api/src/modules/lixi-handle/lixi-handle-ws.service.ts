
import { adjustRate, COIN, coinInfo, DanaRate, GHPerDana, ratioHash256 } from '@bcpros/lixi-models';
import { decode, encode } from '@msgpack/msgpack';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BlockInfo, ChronikClient, SubscribeMsg, Tx } from 'chronik-client';
import { Redis } from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { template } from 'src/utils/stringTemplate';
import { fromSatoshisToCoin } from 'src/utils/cashMethods';

@Injectable()
export class LixiHandleWsService implements OnModuleInit {
  private logger: Logger = new Logger(HandleWsService.name);
  private keyInfoBlockPrefix = 'items:blocks:{{coin}}:item-data';
  private keyInfoConvertPrefix = 'items:convert-dana:{{coin}}:item-data';
  private keyAdjustDana = 'items:dana-rate-adjust:{{coin}}';

  private keyHighestBlockData = 'items:block-highest:{{coin}}';
  private keyHighestConvertData = 'items:convert-dana-highest:{{coin}}';
  private keyCurrentAdjustDana = 'items:dana-rate-adjust-current:{{coin}}';
  private keyIndexHighestBlockData = 'items:index-block-highest:{{coin}}';

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
          const keyHighestBlockCoin = template(this.keyIndexHighestBlockData, { coin: COIN.XPI });
          const blockHighestInfo = (await this.chronikXPI.block(msg.blockHash)).blockInfo;
          const currentIndexHighest = Number((await this.redis.get(keyHighestBlockCoin)) ?? '1');

          if (blockHighestInfo.height < currentIndexHighest + 10) {
            this.handleNewBlock(msg.blockHash, COIN.XPI);
            this.redis.set(keyHighestBlockCoin, blockHighestInfo.height);
          }

          //adjust dana by blockTime
          const keyAdjustDanaByXPI = template(this.keyAdjustDana, { coin: COIN.XPI });
          const keyCurrentAdjustDanaByXPI = template(this.keyCurrentAdjustDana, { coin: COIN.XPI });
          if (Number.isInteger(blockHighestInfo.height / coinInfo[COIN.XPI].totalBlockInDay)) {
            const currentAdjust = await this.redis.hget(keyCurrentAdjustDanaByXPI, KeyCurrentAdjust);
            if (!currentAdjust) {
              //set default: 100GH
              Promise.all([
                this.redis.hset(keyAdjustDanaByXPI, blockHighestInfo.height, GHPerDana),
                this.redis.hset(keyCurrentAdjustDanaByXPI, KeyCurrentAdjust, GHPerDana)
              ]);
            } else {
              const currentAdjustRateDana = Number(currentAdjust) / adjustRate;
              Promise.all([
                this.redis.hset(keyAdjustDanaByXPI, blockHighestInfo.height, currentAdjustRateDana),
                this.redis.hset(keyCurrentAdjustDanaByXPI, KeyCurrentAdjust, currentAdjustRateDana)
              ]);
            }
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


    this.logger.log(`The module has been initialized.`);
  }

  async parseWebsocketMessage(wsMsg: SubscribeMsg) {

    // determine message type 
    // type can be AddedToMempool, BlockConnected, or Confirmed
    const { type } = wsMsg;
    switch (type) {
      case 'BlockConnected': {
        return this.blockConnectedLock
          .acquire('handleBlockConnected', async function () {
            return await handleBlockConnected(
              wsMsg.blockHash,
            );
          })
          .then(
            result => {
              // lock released with no error
              return result;
            },
            error => {
              // lock released with error thrown by handleBlockConnected()
              console.log(
                `Error in handleBlockConnected called by ${wsMsg.blockHash}`,
                error,
              );
              // TODO notify admin
              return false;
            },
          );
      }
      case 'AddedToMempool':
        return handleAddedToMempool(chronik, db, cache, wsMsg.txid);
      case 'RemovedFromMempool':
        return deletePendingAliases(db, { txid: wsMsg.txid });
      case 'Confirmed':
        break;
      default:
    }
  }

  async handleBlockConnected(blockHash: string) {
    let newBlockInfo;

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
      coin === COIN.XPI
        ? 260 * (Math.log2(difficulty / 16) + 1)
        : parseInt(fromSatoshisToCoin(newBlockInfo.sumCoinbaseOutputSats, coinInfo[COIN.XEC].cashDecimals).toString());

    //calculate GH/coin (hash / issuance)
    const GHPerCoin = GHashratePerBlockTime / issuance;

    //convert dana to coin (xpi, xec,...)
    const keyCurrentAdjustDanaByCoin = template(this.keyCurrentAdjustDana, { coin });
    const adjustGHPerDana = await this.redis.hget(keyCurrentAdjustDanaByCoin, KeyCurrentAdjust);

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

  async handleAddedToMempool(txid: string) {
    // TODO
    let txDetails: Tx;
    try {
      txDetails = await this.chronikXPI.tx(txid);
    } catch (err) {
      this.logger.error(
        `Error in chronik.tx(${txid}) in handleAddedToMempool`,
        err,
      );
      throw err;
    }

    return parseTxForPendingHandles(txDetails);
  }

  async parseTxForPendingHandles(txDetails: Tx) {

    // pending aliases must be unconfirmed
    if (typeof txDetails.block !== 'undefined') {
      return false;
    }
    // Check for valid alias tx(s) in given txDetails
    // Note that getAliasTxs takes an array of txDetails objects
    // In this case we pass an array of just this txDetails
    const potentialPendingAliases = module.exports.getAliasTxs(
      [txDetails],
      aliasConstants,
    );

    if (potentialPendingAliases.length === 0) {
      // We know this tx cannot be a pending alias tx as it contains no valid registration outputs
      return false;
    }

    // Note that parseTxForPendingAliases is only called on one txDetails
    // However, it is possible that one registration tx registers multiple aliases
    // Edge case as in v0 this requires the tx to have multiple OP_RETURN outputs
    let txContainsPendingAlias = false;
    for (const potentialPendingAlias of potentialPendingAliases) {
      const { alias } = potentialPendingAlias;

      if ((await getAliasInfoFromAlias(db, alias)) === null) {
        // If this alias is not already registered, then this is a valid pending registration
        // Note that you may have more than 1 pending alias of the same 'alias'

        // Get tipHeight to set with this pendingAlias
        let tipHeight = cache.get('tipHeight');

        if (typeof tipHeight === 'undefined') {
          // If tipHeight is not set, get it from serverState
          // More expensive call than cache, ok here bc edge case, can only happen
          // for pending alias txs that come in right at server startup
          const { processedBlockheight } = await getServerState(db);
          tipHeight = processedBlockheight;
        }
        potentialPendingAlias.tipHeight = tipHeight;

        const pendingAddedResult = await addOneAliasToPending(
          db,
          potentialPendingAlias,
        );

        if (pendingAddedResult && pendingAddedResult.acknowledged) {
          console.log(`New pending alias: ${alias}`);
          txContainsPendingAlias = true;
        }
      }
    }

    return txContainsPendingAlias;
  }

  async handleMultipleBlock(startBlock: number, endBlock: number, coin = COIN.XPI) {
    let newBlockInfos: BlockInfo[];
    switch (coin) {
      case COIN.XEC:
        newBlockInfos = await this.chronikXEC.blocks(startBlock, endBlock);
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
      const keyCurrentAdjustDanaByCoin = template(this.keyCurrentAdjustDana, { coin });
      const adjustGHPerDana = await this.redis.hget(keyCurrentAdjustDanaByCoin, KeyCurrentAdjust);

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
