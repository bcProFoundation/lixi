import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot, Start, Update, Command } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram-bot.constants';
import { format } from 'node:util';
import { Prisma, Role } from '@bcpros/lixi-prisma';
import moment from 'moment';
import { BOT, InfoStatistics, PERIOD_TIME } from 'src/utils/bot.constants';
import { ConfigService } from '@nestjs/config';
import { InjectChronikClientNode } from 'nestjs-chronik';
import { ChronikClientNode, MsgTxClient, TxOutput_InNode, WsEndpoint_InNode, WsMsgClient } from 'chronik-client';
import { LocalEcashCacheService } from './local-ecash-cache.service';
import { COIN, coinInfo } from '@bcpros/lixi-models';
import _ from 'lodash';
import cashaddr from 'ecashaddrjs';

type ParsedUtxoType = {
  txid: string;
  amount: number;
  chronikWatchAddresses: any;
  hash160: string;
  type: string;
  tokenId?: string;
};

@Update()
@Injectable()
export class LocalEcashBotUpdate implements OnModuleInit {
  private logger: Logger = new Logger(LocalEcashBotUpdate.name);
  private chronikWs: WsEndpoint_InNode;

  constructor(
    @InjectChronikClientNode('xec') private chronik: ChronikClientNode,
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly localEcashCacheService: LocalEcashCacheService
  ) {
    this.chronikWs = this.chronik.ws({
      onMessage: this._chronikHandleWsMessage,
      onReconnect: e => {
        // Fired before a reconnect attempt is made:
        this.logger.log('Chronik Watcher reconnecting websocket, disconnection cause: ');
      },
      onConnect: e => {
        this.logger.log(`Chronik Watcher websocket connected`);
      },
      onError: e => {
        this.logger.log('Chronik Watcher error', e);
      }
    });
  }

  async onModuleInit() {
    try {
      //ws for xec
      await this.chronikWs.waitForOpen().catch(e => {
        this.chronikWs.close();
        this.logger.log(
          `Chronik Watcher - websocket - has closed: ${this.chronikWs.manuallyClosed}`,
          LocalEcashBotUpdate.name
        );
        return;
      });

      //we need to subscribe address to listen new block

      const chronikWatchAddress = await this.prisma.chronikWatchAddress.findMany({});

      const addresses = _.uniq(
        chronikWatchAddress.map(item => ({
          type: item.type,
          hash: item.hash160
        }))
      );

      for (const address of addresses) {
        if (address.type === 'p2pkh') {
          this.chronikWs.subscribeToScript('p2pkh', address.hash);
        } else if (address.type === 'p2sh') {
          this.chronikWs.subscribeToScript('p2sh', address.hash);
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  _convertOutputScript(
    output: TxOutput_InNode
  ): { hash160: string; amount: number; tokenId?: string; type: string } | null {
    try {
      let amount = 0;

      const { hash, type } = cashaddr.getTypeAndHashFromOutputScript(output.outputScript);
      const hash160: string = hash;

      if (output.token) {
        amount = Number(output.token.amount);
        return { hash160, amount, tokenId: output.token.tokenId, type };
      } else {
        amount = output.value ? Number(output.value.toString()) : 0;
        return { hash160, amount, type };
      }
    } catch (e) {
      return null;
    }
  }

  private _chronikHandleWsMessage = async (msg: WsMsgClient) => {
    try {
      // get the message type
      const { type } = msg;

      // For now, only act on "first seen" transactions, as the only logic to happen is first seen notifications
      // Dev note: Other chronik msg types
      // "BlockConnected", arrives as new blocks are found
      // "Confirmed", arrives as subscribed + seen txid is confirmed in a block
      if (type === 'Error') {
        return;
      }

      // get txid info
      const { txid } = msg as MsgTxClient;

      try {
        const { outputs, tokenEntries } = await this.chronik.tx(txid);

        let outputsConverted = _.compact(
          _.uniq(
            _.map(outputs, output => {
              return this._convertOutputScript(output);
            })
          )
        );

        const chronikWatchAddresses = await this.prisma.chronikWatchAddress.findMany({
          where: {
            hash160: {
              in: _.map(outputsConverted, item => item.hash160)
            }
          },
          include: {
            account: {
              select: {
                telegramId: true
              }
            }
          }
        });

        if (chronikWatchAddresses.length > 0) {
          for (const chronikWatchAddress of chronikWatchAddresses) {
            const { amount, hash160, tokenId, type } =
              outputsConverted.find(item => item.hash160 === chronikWatchAddress.hash160)! || {};

            const parsedUtxo: ParsedUtxoType = {
              txid: txid,
              amount: amount,
              chronikWatchAddresses,
              hash160: hash160,
              type: type,
              tokenId: tokenId ?? undefined
            };

            tokenEntries.length > 0
              ? await this.receivedSLPDeposit(parsedUtxo)
              : await this.receivedXECDeposit(parsedUtxo);
          }
        }
      } catch (err) {
        // In this case, no notification
        return this.logger.log(`Error in chronik.tx(${txid} while processing an incoming websocket tx`, err);
      }

      // parse tx for notification
      // const parsedChronikTx = await parseChronikTx(XPI, chronik, incomingTxDetails, wallet);
    } catch (e: any) {
      throw new Error(`_chronikHandleWsMessage: ${e.message}`);
    }
  };

  async receivedSLPDeposit(parsedUtxo: ParsedUtxoType) {
    const { txid, amount, chronikWatchAddresses, hash160, tokenId, type } = parsedUtxo;
    const { genesisInfo } = await this.chronik.token(tokenId!);

    const address =
      type === 'p2pkh' ? cashaddr.encode('etoken', 'p2pkh', hash160) : cashaddr.encode('etoken', 'p2sh', hash160);

    const formatReplied = format(
      BOT.MESSAGE.CHRONIK_WATCH_RECIEVED_SLP,
      address,
      (amount / Math.pow(10, genesisInfo.decimals)).toLocaleString(),
      genesisInfo.tokenTicker,
      `${coinInfo[COIN.XEC].blockExplorerUrl}/tx/${txid}`
    );

    for (const chronikWatchAddress of chronikWatchAddresses) {
      const cached = await this.localEcashCacheService.getTelegramNotificationCacheItem(
        chronikWatchAddress.account.telegramId!,
        txid
      );

      if (!cached) {
        await this.bot.telegram
          .sendMessage(chronikWatchAddress.account.telegramId!, formatReplied, {
            parse_mode: 'Markdown'
          })
          .catch(e => {
            this.logger.error(e);
          });

        await this.localEcashCacheService.cacheTelegramNotification(chronikWatchAddress.account.telegramId!, txid);
      }
    }
  }

  async receivedXECDeposit(parsedUtxo: ParsedUtxoType) {
    const { txid, amount, chronikWatchAddresses, hash160, type } = parsedUtxo;

    const address =
      type === 'p2pkh' ? cashaddr.encode('ecash', 'p2pkh', hash160) : cashaddr.encode('ecash', 'p2sh', hash160);

    const formatReplied = format(
      BOT.MESSAGE.CHRONIK_WATCH_RECIEVED_XEC,
      address,
      (amount / Math.pow(10, 2)).toLocaleString(),
      `${coinInfo[COIN.XEC].blockExplorerUrl}/tx/${txid}`
    );

    for (const chronikWatchAddress of chronikWatchAddresses) {
      const cached = await this.localEcashCacheService.getTelegramNotificationCacheItem(
        chronikWatchAddress.account.telegramId!,
        txid
      );

      if (!cached) {
        await this.bot.telegram
          .sendMessage(chronikWatchAddress.account.telegramId!, formatReplied, {
            parse_mode: 'Markdown'
          })
          .catch(e => {
            this.logger.error(e);
          });

        await this.localEcashCacheService.cacheTelegramNotification(chronikWatchAddress.account.telegramId!, txid);
      }
    }
  }

  @Start()
  async onStart(ctx: Context) {
    const isMiniAppEnabled: boolean = this.config.get('TELEGRAM_MINI_APP_ENABLED') === 'true';
    const formatReplied = format(
      `Welcome to the Local eCash Bot, your gateway to securely trading $XEC on Telegram! This mini-app features an innovative on-chain escrow system for buying and selling, alongside a non-custodial wallet where your keys stay safe on your device, keeping your funds out of third-party hands. Don't miss out on updates and special offers by following our channel @localecash.

Are you ready? Let's get started.

[Start trading](%s)`,
      isMiniAppEnabled
        ? `https://t.me/${this.config.get('TELEGRAM_LOCAL_ECASH_BOT_NAME')}?startapp`
        : this.config.get('LOCAL_ECASH_URL')
    );

    await ctx.reply(formatReplied, {
      parse_mode: 'Markdown'
    });
    return;
  }

  @Command('help')
  async listAllCommand(ctx: Context) {
    const helpMessage = `
  💡 *Available Commands* 💡

      - 🎯 /start - Start interacting with the Local eCash Bot.
      - 🆘 /help - Display this help message.
      - 👀 /watch - Add watching address i.e. /watch ecash:qqth...jfje
      - 🗑️ /removewatch - Remove watched address i.e. /removewatch ecash:qqth...jfje 
      - 📋 /listwatch - List all watched addresses
      
      If you need further assistance, feel free to contact our support team or visit our [Telegram Channel](https://t.me/localecash).
      
      Happy trading! 🚀
    `;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  @Command('stats')
  async onInfo(ctx: Context) {
    try {
      //process for args
      //Context dont have type message.text
      const args = (ctx?.message as { text: string }).text?.split(' ')[1];
      let targetDate = args?.trim();

      // Default to current time if no valid date is provided
      let date = new Date();
      let infoMessage = '';

      // Check if the date is in the format 'YYYYMMDD'
      if (targetDate) {
        if (moment(targetDate, 'YYYYMMDD', true).isValid()) {
          const year = targetDate.substring(0, 4);
          const month = targetDate.substring(4, 6);
          const day = targetDate.substring(6, 8);

          // Create a UTC Date object with the provided date at 00:00
          date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
        } else {
          infoMessage = '🚨 Wrong date format! Please use YYYYMMDD (e.g., 20240101 for January 1, 2024).';
          await ctx.reply(infoMessage);
          return;
        }
      }

      const mods = await this.prisma.account.findMany({
        where: {
          OR: [{ role: Role.MODERATOR }, { role: Role.ARBITRATOR }]
        }
      });

      const findedMod = mods.filter(mod => mod?.telegramId === ctx?.message?.from?.id?.toString());

      if (findedMod.length === 0) {
        infoMessage = ` Only moderators can use this command.`;
        await ctx.reply(infoMessage, {
          parse_mode: 'Markdown'
        });
        return;
      }

      const infoOneYearOrders = await this.getStats(date, PERIOD_TIME.YEAR);
      const infoOneMonthOrders = await this.getStats(date, PERIOD_TIME.MONTH);
      const infoOneWeekOrders = await this.getStats(date, PERIOD_TIME.WEEK);
      const infoOneDayOrders = await this.getStats(date, PERIOD_TIME.DAY);

      infoMessage = `
   📊 *Stats Overview* 📊

   - 📅 *1 Year Stats*: 
    ${this.infoStatistics(infoOneYearOrders[0])}
   - 📅 *1 Month Stats*: 
    ${this.infoStatistics(infoOneMonthOrders[0])}
   - 📅 *1 Week Stats*: 
    ${this.infoStatistics(infoOneWeekOrders[0])}
   - 📅 *1 Day Stats*: 
    ${this.infoStatistics(infoOneDayOrders[0])}
   For additional help, type /help.
   `;

      await ctx.reply(infoMessage, {
        parse_mode: 'Markdown'
      });
    } catch (e) {
      this.logger.error(e, LocalEcashBotUpdate.name);
      await ctx.reply('Error getting stats.');
      return;
    }
  }

  private infoStatistics(info: InfoStatistics) {
    return ` - Total Amount Donated: *${info.amount_donated?.toLocaleString('en-US')}* XEC
     - Successful Trades: *${(info.success_ratio * 100)?.toFixed(0)}%* 
     - Average Settle Time: *${info.avg_settle_time ? info.avg_settle_time?.toFixed(2) : '0'} hours*
     - Total Trades: *${info.total_trades}* 
     - Total Amount Traded: *${info.amount_traded ? info.amount_traded?.toLocaleString('en-US') : '0'}* XEC
     - Unique Trades: *${info.unique_trade_count}*
    `;
  }

  private async getStats(timeStart: Date, period: string): Promise<Array<InfoStatistics>> {
    const formattedTimeStart = timeStart.toISOString();
    const rawQuery = Prisma.sql`
    WITH 
    -- Precompute data for reuse
    Precomputed AS (
        SELECT 
            eo.*,
            d.status AS dispute_status,
            EXTRACT(EPOCH FROM (eo.updated_at - eo.created_at)) / 3600 AS settle_time
        FROM escrow_order eo
        LEFT JOIN dispute d ON eo.id = d.escrow_order_id
        WHERE eo.created_at BETWEEN ${formattedTimeStart} :: timestamptz - ${period} :: interval AND ${formattedTimeStart} :: timestamptz
    ),

    -- Calculate overall statistics
    OverallStats AS (
        SELECT 
            COALESCE(SUM(eo.seller_donate_amount), 0) + COALESCE(SUM(eo.buyer_donate_amount), 0) AS amount_donated,
            -- success orders = orders with status 'COMPLETE' without dispute
            -- completed orders = orders with status 'COMPLETE'
            -- success rate = success-order / complete-order
            SUM(CASE WHEN eo.status = 'COMPLETE' AND eo.dispute_status IS NULL THEN 1 ELSE 0 END) * 1.0 /  
              SUM(CASE WHEN eo.status = 'COMPLETE' THEN 1 ELSE 0 END) AS success_ratio,
            AVG(eo.settle_time) AS avg_settle_time,
            SUM(CASE WHEN eo.status = 'COMPLETE' THEN eo.amount ELSE 0 END) AS amount_traded,
            COUNT(CASE WHEN eo.status != 'PENDING' THEN 1 ELSE NULL END) AS total_trades
        FROM Precomputed eo
    ),

    -- Calculate unique trade counts
    UniqueTradeCounts AS (
      SELECT 
        LEAST(seller_account_id, buyer_account_id) AS account_1,
        GREATEST(seller_account_id, buyer_account_id) AS account_2
      FROM escrow_order as eo
      WHERE
        eo.status = 'COMPLETE' AND  
        eo.created_at BETWEEN ${formattedTimeStart} :: timestamptz - ${period} :: interval AND ${formattedTimeStart} :: timestamptz
      GROUP BY 
        LEAST(seller_account_id, buyer_account_id), 
        GREATEST(seller_account_id, buyer_account_id)
    ),

    -- Count unique Trades
    SpecificUniqueTrades AS (
        SELECT COUNT(*) AS unique_trade_count
        FROM UniqueTradeCounts
    )

    -- Combine the results
    SELECT 
        os.amount_donated,
        os.success_ratio,
        os.avg_settle_time,
        os.amount_traded,
        os.total_trades,
        sut.unique_trade_count
    FROM 
        OverallStats os,
        SpecificUniqueTrades sut;
  `;

    const statistics = await this.prisma.$queryRaw<InfoStatistics[]>(rawQuery);

    return statistics;
  }

  @Command('watch')
  async onWatch(ctx: Context) {
    try {
      const args = (ctx?.message as { text: string }).text?.split(' ')[1];
      let targetAddress = args?.trim();

      if (!targetAddress) {
        await ctx.reply('Please provide a valid address.');
        return;
      }

      const { type, hash } = cashaddr.decode(targetAddress, true);

      const account = await this.prisma.account.findFirst({
        where: {
          telegramId: ctx.from?.id.toString()
        },
        include: {
          chronikWatchAddresses: true
        }
      });

      if (!account) {
        await ctx.sendMessage('Please create account at @local_ecash_bot', {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      if (account.chronikWatchAddresses.find(item => item.hash160 === hash)) {
        await ctx.sendMessage(`Address is already registered!`, {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      //connect to chronik ws
      const subs = this.chronikWs.subs.scripts;

      if (!_.find(subs, item => item.payload === hash)) {
        //@ts-ignore
        this.chronikWs.subscribeToScript(type.toLowerCase(), hash);
      }

      //add to prisma
      await this.prisma.chronikWatchAddress.create({
        data: {
          accountId: account.id,
          hash160: hash as string,
          type
        }
      });

      await ctx.sendMessage(`Address successfully registered!`, {
        protect_content: true,
        parse_mode: 'Markdown',
        reply_parameters: {
          message_id: ctx.msgId!
        }
      });
    } catch (e) {
      this.logger.error(e, LocalEcashBotUpdate.name);
      await ctx.reply('Error adding address.');
      return;
    }
  }

  @Command('removewatch')
  async onRemove(ctx: Context) {
    try {
      const args = (ctx?.message as { text: string }).text?.split(' ')[1];
      let targetAddress = args?.trim();

      if (!targetAddress) {
        await ctx.reply('Please provide a valid address.');
        return;
      }

      const { hash } = cashaddr.decode(targetAddress, true);

      //remove from prisma
      const account = await this.prisma.account.findFirst({
        where: {
          telegramId: ctx.from?.id.toString()
        },
        include: {
          chronikWatchAddresses: true
        }
      });

      if (!account) {
        await ctx.sendMessage('Please create account at @local_ecash_bot', {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      const chronikWatchAddress = account.chronikWatchAddresses.find(item => item.hash160 === hash);

      if (!chronikWatchAddress) {
        await ctx.sendMessage(`Address is not registered!`, {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      //remove from prisma
      await this.prisma.chronikWatchAddress.delete({
        where: {
          id: chronikWatchAddress.id
        }
      });

      //disconnect from chronik ws if there are no more targetAddress
      const addresses = await this.prisma.chronikWatchAddress.findMany({
        where: {
          hash160: hash as string
        }
      });

      if (addresses.length === 0) {
        this.chronikWs.unsubscribeFromScript('p2pkh', hash as string);
      }

      await ctx.sendMessage(`Address successfully removed!`, {
        protect_content: true,
        parse_mode: 'Markdown',
        reply_parameters: {
          message_id: ctx.msgId!
        }
      });
    } catch (e) {
      this.logger.error(e, LocalEcashBotUpdate.name);
      await ctx.reply('Error removing address.');
      return;
    }
  }

  @Command('listwatch')
  async onList(ctx: Context) {
    try {
      const account = await this.prisma.account.findFirst({
        where: {
          telegramId: ctx.from?.id.toString()
        },
        include: {
          chronikWatchAddresses: true
        }
      });

      if (!account) {
        await ctx.sendMessage('Please create account at @local_ecash_bot', {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      const chronikWatchAddress = account.chronikWatchAddresses.map(item => ({
        type: item.type,
        hash: item.hash160
      }));

      if (account.chronikWatchAddresses.length === 0) {
        await ctx.sendMessage(`No addresses registered!`, {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      const addressReplyFormat = chronikWatchAddress.map((item, index) => {
        if (item.type === 'p2pkh') {
          const ecash = cashaddr.encode('ecash', 'p2pkh', item.hash);
          const etoken = cashaddr.encode('etoken', 'p2pkh', item.hash);

          return `${index + 1}. [${ecash}](${coinInfo[COIN.XEC].blockExplorerUrl}/address/${ecash})
          [${etoken}](${coinInfo[COIN.XEC].blockExplorerUrl}/address/${etoken})`;
        }

        if (item.type === 'p2sh') {
          const ecash = cashaddr.encode('ecash', 'p2sh', item.hash);
          const etoken = cashaddr.encode('etoken', 'p2sh', item.hash);

          return `${index + 1}. [${ecash}](${coinInfo[COIN.XEC].blockExplorerUrl}/address/${ecash})
          [${etoken}](${coinInfo[COIN.XEC].blockExplorerUrl}/address/${etoken})`;
        }
      });

      await ctx.sendMessage(
        `Addresses registered: 
${addressReplyFormat.join('\n')}
          `,
        {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          },
          link_preview_options: {
            is_disabled: true
          }
        }
      );
    } catch (e) {
      this.logger.error(e, LocalEcashBotUpdate.name);
      await ctx.reply('Error listing addresses.');
      return;
    }
  }
}
