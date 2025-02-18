import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot, Start, Update, Command } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { TELEGRAM_CHRONIK_WATCHER_BOT_NAME } from '../telegram-bot.constants';
import { format } from 'node:util';
import { ChronikWatchAddress, Prisma, Role } from '@bcpros/lixi-prisma';
import moment from 'moment';
import { BOT, InfoStatistics, PERIOD_TIME } from 'src/utils/bot.constants';
import { ConfigService } from '@nestjs/config';
import { ChronikClientNode, MsgTxClient, WsEndpoint_InNode, WsMsgClient } from 'chronik-client';
import { InjectChronikClientNode } from 'nestjs-chronik';
import { isValidXecAddress } from 'src/utils/cashMethodsNode';
import _ from 'lodash';
import { COIN, coinInfo } from '@bcpros/lixi-models';
import * as cashaddr from 'ecashaddrjs';
import { ChronikWatcherCacheService } from './chronik-watcher-cache.service';

type ParsedUtxoType = {
  txid: string;
  amount: string;
  chronikWatchAddresses: any;
  address: string;
  tokenId?: string;
};

@Update()
@Injectable()
export class ChronikWatcherBotUpdate implements OnModuleInit {
  private logger: Logger = new Logger(ChronikWatcherBotUpdate.name);
  private chronikWs: WsEndpoint_InNode;

  constructor(
    @InjectChronikClientNode('xec') private chronik: ChronikClientNode,
    @InjectBot(TELEGRAM_CHRONIK_WATCHER_BOT_NAME) private bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chronikWatcherCacheService: ChronikWatcherCacheService
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
          ChronikWatcherBotUpdate.name
        );
      });

      //we need to subscribe address to listen new block

      const chronikWatchAddress = await this.prisma.chronikWatchAddress.findMany({});

      const addresses = _.uniq(chronikWatchAddress.map(item => item.address));

      for (const address of addresses) {
        this.chronikWs.subscribeToAddress(address);
      }
    } catch (e) {
      this.logger.error(e);
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
        const { outputs, tokenEntries, inputs } = await this.chronik.tx(txid);
        let startIndex: number = tokenEntries.length > 0 ? 1 : 0;
        const outScripts = outputs.map(output => output.outputScript);

        // process each tx output
        for (let i = startIndex; i < outScripts.length; i++) {
          const scriptHex = outScripts[i];
          const { type, hash } = cashaddr.getTypeAndHashFromOutputScript(scriptHex);
          const ecashAddress = cashaddr.encode('ecash', type, hash);

          const chronikWatchAddresses = await this.prisma.chronikWatchAddress.findMany({
            where: {
              address: ecashAddress
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
            const parsedUtxo: ParsedUtxoType = {
              txid: txid,
              amount: startIndex === 1 ? outputs[i].token!.amount : outputs[i].value.toString(),
              chronikWatchAddresses,
              address: ecashAddress,
              tokenId: tokenEntries.length > 0 ? tokenEntries[0].tokenId : undefined
            };
            tokenEntries.length > 0
              ? await this.receivedSLPDeposit(parsedUtxo)
              : await this.receivedXECDeposit(parsedUtxo);
          }
        }
      } catch (err) {
        // In this case, no notification
        return console.log(`Error in chronik.tx(${txid} while processing an incoming websocket tx`, err);
      }

      // parse tx for notification
      // const parsedChronikTx = await parseChronikTx(XPI, chronik, incomingTxDetails, wallet);
    } catch (e: any) {
      throw new Error(`_chronikHandleWsMessage: ${e.message}`);
    }
  };

  async receivedSLPDeposit(parsedUtxo: ParsedUtxoType) {
    const { txid, amount, chronikWatchAddresses, address, tokenId } = parsedUtxo;
    const { genesisInfo } = await this.chronik.token(tokenId!);

    const formatReplied = format(
      BOT.MESSAGE.CHRONIK_WATCH_RECIEVED_SLP,
      address,
      parseFloat(amount) / Math.pow(10, genesisInfo.decimals),
      genesisInfo.tokenTicker,
      `${coinInfo[COIN.XEC].blockExplorerUrl}/tx/${txid}`
    );

    for (const chronikWatchAddress of chronikWatchAddresses) {
      const cached = await this.chronikWatcherCacheService.getTelegramNotificationCacheItem(
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

        await this.chronikWatcherCacheService.cacheTelegramNotification(chronikWatchAddress.account.telegramId!, txid);
      }
    }
  }

  async receivedXECDeposit(parsedUtxo: ParsedUtxoType) {
    const { txid, amount, chronikWatchAddresses, address } = parsedUtxo;

    const formatReplied = format(
      BOT.MESSAGE.CHRONIK_WATCH_RECIEVED_XEC,
      address,
      parseFloat(amount) / Math.pow(10, 2),
      `${coinInfo[COIN.XEC].blockExplorerUrl}/tx/${txid}`
    );

    for (const chronikWatchAddress of chronikWatchAddresses) {
      const cached = await this.chronikWatcherCacheService.getTelegramNotificationCacheItem(
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

        await this.chronikWatcherCacheService.cacheTelegramNotification(chronikWatchAddress.account.telegramId!, txid);
      }
    }
  }

  @Start()
  async onStart(ctx: Context) {
    await ctx.reply('Welcome to the Chronik Watcher Bot, please use /help to display all commands.');
    return;
  }

  @Command('help')
  async listAllCommand(ctx: Context) {
    const helpMessage = `
  💡 *Available Commands* 💡

/watch - Add watching address i.e. /add ecash:qqth...jfje
/removewatch - Remove watched address i.e. /remove ecash:qqth...jfje 
/watchlist - List all watched addresses
    `;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  @Command('watch')
  async onAdd(ctx: Context) {
    try {
      const args = (ctx?.message as { text: string }).text?.split(' ')[1];
      let targetAddress = args?.trim();

      if (!targetAddress || !isValidXecAddress(targetAddress)) {
        await ctx.reply('Please provide a valid address.');
        return;
      }

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

      if (account.chronikWatchAddresses.find(item => item.address === targetAddress)) {
        await ctx.sendMessage(`Address is already registered!`, {
          protect_content: true,
          parse_mode: 'Markdown',
          reply_parameters: {
            message_id: ctx.msgId!
          }
        });
        return;
      }

      //add to prisma
      await this.prisma.chronikWatchAddress.create({
        data: {
          accountId: account.id,
          address: targetAddress
        }
      });

      //connect to chronik ws
      this.chronikWs.subscribeToAddress(targetAddress);

      await ctx.sendMessage(`Address successfully registered!`, {
        protect_content: true,
        parse_mode: 'Markdown',
        reply_parameters: {
          message_id: ctx.msgId!
        }
      });
    } catch (e) {
      this.logger.error(e, ChronikWatcherBotUpdate.name);
      await ctx.reply('Error adding address.');
      return;
    }
  }

  @Command('removewatch')
  async onRemove(ctx: Context) {
    try {
      const args = (ctx?.message as { text: string }).text?.split(' ')[1];
      let targetAddress = args?.trim();

      if (!targetAddress || !isValidXecAddress(targetAddress)) {
        await ctx.reply('Please provide a valid address.');
        return;
      }

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

      const chronikWatchAddress = account.chronikWatchAddresses.find(item => item.address === targetAddress);

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

      //disconnect from chronik ws
      this.chronikWs.unsubscribeFromAddress(targetAddress);

      await ctx.sendMessage(`Address successfully removed!`, {
        protect_content: true,
        parse_mode: 'Markdown',
        reply_parameters: {
          message_id: ctx.msgId!
        }
      });
    } catch (e) {
      this.logger.error(e, ChronikWatcherBotUpdate.name);
      await ctx.reply('Error removing address.');
      return;
    }
  }

  @Command('watchlist')
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

      const chronikWatchAddress = account.chronikWatchAddresses.map(item => item.address);

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

      const addressReplyFormat = chronikWatchAddress.map(
        item => `- [${item}](${coinInfo[COIN.XEC].blockExplorerUrl}/address/${item})`
      );

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
      this.logger.error(e, ChronikWatcherBotUpdate.name);
      await ctx.reply('Error listing addresses.');
      return;
    }
  }
}
