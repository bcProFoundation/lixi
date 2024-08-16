import { Injectable, Logger, OnModuleInit, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Help, InjectBot, On, Message, Start, Update, Command } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from './telegram-bot.constants';

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
  async onStart(): Promise<string> {
    const me = await this.bot.telegram.getMe();
    return `Hey, I'm ${me.first_name}`;
  }

  @Help()
  async onHelp(): Promise<string> {
    return 'Send me any text';
  }

  @Command('echo')
  async onEcho(ctx: Context) {
    await ctx.reply('echo');
  }
}
