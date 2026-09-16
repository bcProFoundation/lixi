import { DynamicModule, Module, Provider } from '@nestjs/common';
import { createAsyncProviders } from '../telegram-bot.providers';
import { TelegramBotModuleAsyncOptions } from '../telegram-bot.interface';
import { DEFAULT_BOT_NAME, TelegrafModule, getBotToken } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { LocalEcashBotUpdate } from './local-ecash-bot.update';
import { TelegramBotController } from './local-ecash-bot.controller';
import { LocalEcashCacheService } from './local-ecash-cache.service';

const noopTelegrafBot = {
  telegram: {
    sendMessage: async () => ({ message_id: 0 })
  }
};

@Module({})
export class LocalEcashBotModule {
  public static forRootAsync(options: TelegramBotModuleAsyncOptions): DynamicModule {
    const asyncProviders = createAsyncProviders(options);
    const botToken = process.env.TELEGRAM_LOCAL_ECASH_BOT_TOKEN;
    const botEnabled = Boolean(botToken);

    const imports = [];
    const controllers = botEnabled ? [TelegramBotController] : [];
    const otherProviders: Provider[] = botEnabled ? [LocalEcashBotUpdate] : [];
    const providers: Provider[] = [...asyncProviders, ...otherProviders, LocalEcashCacheService];

    if (botEnabled) {
      providers.push(TelegramBotController);
      imports.push(
        TelegrafModule.forRootAsync({
          inject: [ConfigService],
          botName: process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME,
          useFactory: async (configService: ConfigService) => {
            return {
              token: configService.get<string>('TELEGRAM_LOCAL_ECASH_BOT_TOKEN')!,
              include: [LocalEcashBotModule]
            };
          }
        })
      );
    } else {
      providers.push({
        provide: getBotToken(process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME) ?? DEFAULT_BOT_NAME,
        useValue: noopTelegrafBot
      });
    }

    return {
      module: LocalEcashBotModule,
      global: !botEnabled,
      imports: (options.imports || []).concat(imports),
      controllers,
      providers,
      exports: botEnabled ? [...otherProviders, TelegramBotController] : [getBotToken(process.env.TELEGRAM_LOCAL_ECASH_BOT_NAME) ?? DEFAULT_BOT_NAME]
    } as DynamicModule;
  }
}
