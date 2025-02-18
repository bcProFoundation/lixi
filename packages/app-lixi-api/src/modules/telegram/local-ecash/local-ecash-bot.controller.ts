import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { Context, Telegraf } from 'telegraf';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram-bot.constants';

@Controller('telegram-bot')
export class TelegramBotController {
  private logger: Logger = new Logger(TelegramBotController.name);

  constructor(
    @InjectBot(TELEGRAM_LOCAL_ECASH_BOT_NAME) private bot: Telegraf<Context>,
    private prisma: PrismaService
  ) {}

  @Get('healthcheck')
  async healthcheck() {
    return 'Good to go';
  }
}
