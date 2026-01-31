import { DynamicModule, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from '../telegram-bot.constants';

@Module({})
export class ErrorNotificationBotModule {
  public static forRootAsync(): DynamicModule {
    const imports = [];

    process.env.TELEGRAM_LOCAL_ECASH_BOT_TOKEN &&
      imports.push(
        TelegrafModule.forRootAsync({
          inject: [ConfigService],
          botName: TELEGRAM_LOCAL_ECASH_BOT_NAME,
          useFactory: async (configService: ConfigService) => {
            return {
              token: configService.get<string>('TELEGRAM_LOCAL_ECASH_BOT_TOKEN')!,
              include: [],
              botName: TELEGRAM_LOCAL_ECASH_BOT_NAME
            };
          }
        })
      );

    return {
      module: ErrorNotificationBotModule,
      imports: imports,
      providers: [],
      exports: []
    } as DynamicModule;
  }
}
