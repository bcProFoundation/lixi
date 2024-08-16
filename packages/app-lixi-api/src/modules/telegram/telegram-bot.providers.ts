import { Provider, Type } from '@nestjs/common';
import { TELEGRAM_BOT_MODULE_OPTIONS } from './telegram-bot.constants';
import { TelegramBotModuleAsyncOptions, TelegramBotModuleOptionsFactory } from './telegram-bot.interface';

export function createAsyncProviders(options: TelegramBotModuleAsyncOptions): Provider[] {
  if (options.useExisting || options.useFactory) {
    return [createAsyncOptionsProvider(options)];
  }

  const useClass = options.useClass as Type<TelegramBotModuleOptionsFactory>;
  return [
    createAsyncOptionsProvider(options),
    {
      provide: useClass,
      useClass
    }
  ];
}

export function createAsyncOptionsProvider(options: TelegramBotModuleAsyncOptions): Provider {
  if (options.useFactory) {
    return {
      provide: TELEGRAM_BOT_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || []
    };
  }
  return {
    provide: TELEGRAM_BOT_MODULE_OPTIONS,
    useFactory: async (optionsFactory: TelegramBotModuleOptionsFactory) =>
      await optionsFactory.createTelegramBotOptions(),
    inject: [(options.useClass || options.useExisting) as Type<TelegramBotModuleOptionsFactory>]
  };
}
