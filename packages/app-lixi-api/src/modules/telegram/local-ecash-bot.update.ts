import { Injectable, Logger, OnModuleInit, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Help, InjectBot, On, Message, Start, Update, Command } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from './telegram-bot.constants';
import { format } from 'node:util';

@Update()
@Injectable()
export class LocalEcashBotUpdate implements OnModuleInit {
  private logger: Logger = new Logger(LocalEcashBotUpdate.name);

  constructor(
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {}

  @Start()
  async onStart(ctx: Context) {
    const formatReplied = format(
      `Welcome to the Local eCash Bot, your gateway to securely trading $XEC on Telegram! This mini-app features an innovative on-chain escrow system for buying and selling, alongside a non-custodial wallet where your keys stay safe on your device, keeping your funds out of third-party hands. Don't miss out on updates and special offers by following our channel @localecash.

Are you ready? Let's get started.

Link to button to [Open App](%s) (Start trading)`,
      `https://t.me/${process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME}?startapp`
    );

    await ctx.reply(formatReplied, {
      parse_mode: 'Markdown'
    });
    return;
  }
}
