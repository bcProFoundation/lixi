import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot, Start, Update, Command } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram-bot.constants';
import { format } from 'node:util';
import { Prisma, Role } from '@bcpros/lixi-prisma';
import moment from 'moment';
import { InfoStatistics, PERIOD_TIME } from 'src/utils/bot.constants';
import { ConfigService } from '@nestjs/config';

@Update()
@Injectable()
export class LocalEcashBotUpdate implements OnModuleInit {
  private logger: Logger = new Logger(LocalEcashBotUpdate.name);

  constructor(
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {}

  @Start()
  async onStart(ctx: Context) {
    const formatReplied = format(
      `Welcome to the Local eCash Bot, your gateway to securely trading $XEC on Telegram! This mini-app features an innovative on-chain escrow system for buying and selling, alongside a non-custodial wallet where your keys stay safe on your device, keeping your funds out of third-party hands. Don't miss out on updates and special offers by following our channel @localecash.

Are you ready? Let's get started.

[Start trading](%s)`,
      `https://${this.config.get('LOCAL_ECASH_URL')}`
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
      - 📊 /stats YYYYMMDD - View detailed trade statistics for the past 1 year, month, week, and day. (moderators only).
         + Replace 'YYYYMMDD' with a date in the format *Year-Month-Day* (e.g., '20250101' for January 1, 2025).    
         + If the date is not provided, the current date will be used by default.  
      - 🆘 /help - Display this help message.
      
      If you need further assistance, feel free to contact our support team or visit our [Telegram Channel](https://t.me/localecash).
      
      Happy trading! 🚀
    `;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  @Command('stats')
  async onInfo(ctx: Context) {
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
        role: Role.MODERATOR
      }
    });

    if (!mods || mods.length === 0 || mods[0]?.telegramId !== ctx?.message?.from?.id?.toString()) {
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
  }

  private infoStatistics(info: InfoStatistics) {
    return ` - Total Amount Donated: *${info.amount_donated}* XEC
     - Successful Trades: *${(info.success_ratio * 100)?.toFixed(0)}%* 
     - Average Settle Time: *${info.avg_settle_time ? info.avg_settle_time?.toFixed(2) : '0'} hours*
     - Total Traded: *${info.total_trades}* 
     - Total Amount Trades: *${info.amount_traded ? info.amount_traded?.toLocaleString('en-US') : '0'}* XEC
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
        WHERE eo.created_at BETWEEN ${formattedTimeStart} :: timestamp - ${period} :: interval AND ${formattedTimeStart} :: timestamp
    ),

    -- Calculate overall statistics
    OverallStats AS (
        SELECT 
            COALESCE(SUM(eo.seller_donate_amount), 0) + COALESCE(SUM(eo.buyer_donate_amount), 0) AS amount_donated,
            SUM(CASE WHEN eo.status = 'COMPLETE' OR eo.dispute_status = 'RESOLVED' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS success_ratio,
            AVG(eo.settle_time) AS avg_settle_time,
            SUM(eo.amount) AS amount_traded,
            COUNT(*) AS total_trades
        FROM Precomputed eo
    ),

    -- Calculate unique trade counts
    UniqueTradeCounts AS (
      SELECT 
        LEAST(seller_account_id, buyer_account_id) AS account_1,
        GREATEST(seller_account_id, buyer_account_id) AS account_2
      FROM escrow_order as eo
      WHERE eo.created_at BETWEEN ${formattedTimeStart} :: timestamp - ${period} :: interval AND ${formattedTimeStart} :: timestamp
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
}
