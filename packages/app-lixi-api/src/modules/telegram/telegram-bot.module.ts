import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { createAsyncProviders } from './telegram-bot.providers';
import { TelegramBotModuleAsyncOptions } from './telegram-bot.interface';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalEcashBotUpdate } from './local-ecash-bot.update';
import { TELEGRAM_LOCAL_ECASH_BOT_NAME } from './telegram-bot.constants';
import { TelegramBotController } from './telegram-bot.controller';

@Module({})
export class TelegramBotModule {
  public static forRootAsync(options: TelegramBotModuleAsyncOptions): DynamicModule {
    const asyncProviders = createAsyncProviders(options);

    const otherProviders: Provider[] = [LocalEcashBotUpdate];

    const imports = [];

    process.env.TELEGRAM_LOCAL_ECASH_BOT_TOKEN &&
      imports.push(
        TelegrafModule.forRootAsync({
          inject: [ConfigService],
          botName: TELEGRAM_LOCAL_ECASH_BOT_NAME,
          useFactory: async (configService: ConfigService) => {
            return {
              token: configService.get<string>('TELEGRAM_LOCAL_ECASH_BOT_TOKEN')!,
              include: [TelegramBotModule]
            };
          }
        })
      );

    return {
      module: TelegramBotModule,
      imports: (options.imports || []).concat(imports),
      controllers: [TelegramBotController],
      providers: [...asyncProviders, ...otherProviders, TelegramBotController],
      exports: [...otherProviders, TelegramBotController]
    } as DynamicModule;
  }
}
