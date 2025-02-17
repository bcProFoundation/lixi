import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChronikWatcherBotUpdate } from './chronik-watcher-bot.update';
import { createAsyncProviders } from '../telegram-bot.providers';
import { TELEGRAM_CHRONIK_WATCHER_BOT_NAME } from '../telegram-bot.constants';
import { TelegramBotModuleAsyncOptions } from '../telegram-bot.interface';
import { ChronikWatcherCacheService } from './chronik-watcher-cache.service';

@Module({})
export class ChronikWatcherBotModule {
  public static forRootAsync(options: TelegramBotModuleAsyncOptions): DynamicModule {
    const asyncProviders = createAsyncProviders(options);

    const otherProviders: Provider[] = [ChronikWatcherBotUpdate];

    const imports = [];

    process.env.TELEGRAM_CHRONIK_WATCHER_BOT_TOKEN &&
      imports.push(
        TelegrafModule.forRootAsync({
          inject: [ConfigService],
          botName: TELEGRAM_CHRONIK_WATCHER_BOT_NAME,
          useFactory: async (configService: ConfigService) => {
            return {
              token: configService.get<string>('TELEGRAM_CHRONIK_WATCHER_BOT_TOKEN')!,
              include: [ChronikWatcherBotModule],
              botName: TELEGRAM_CHRONIK_WATCHER_BOT_NAME
            };
          }
        })
      );

    return {
      module: ChronikWatcherBotModule,
      imports: (options.imports || []).concat(imports),
      providers: [...asyncProviders, ...otherProviders, ChronikWatcherCacheService],
      exports: [...otherProviders]
    } as DynamicModule;
  }
}
