import { ModuleMetadata, Provider, Type } from '@nestjs/common';

export interface TelegramBotModuleOptions {
  local_ecash?: {
    token: string;
  };
  chronik_watcher?: {
    token: string;
  };
}

export interface TelegramBotModuleOptionsFactory {
  createTelegramBotOptions(): Promise<TelegramBotModuleOptions> | TelegramBotModuleOptions;
}

export interface TelegramBotModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<TelegramBotModuleOptionsFactory>;
  useClass?: Type<TelegramBotModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<TelegramBotModuleOptions> | TelegramBotModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
