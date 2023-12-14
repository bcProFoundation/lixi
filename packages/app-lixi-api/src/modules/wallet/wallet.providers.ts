import BCHJS from '@bcpros/xpi-js';
import { Provider, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WALLET_MODULE_OPTIONS } from './wallet.constants';
import {
  WalletModuleAsyncOptions,
  WalletModuleOptions,
  WalletModuleOptionsFactory,
  WalletServices
} from './wallet.interface';
import { WalletService } from './wallet.service';
import { ChronikClients } from '../../common/modules/chronik/chronik.interfaces';
import { XecWalletService } from './xec-wallet.service';
import { XpiWalletService } from './xpi-wallet.service';

export const currencyToCoin: Record<string, string> = {
  xec: 'xec',
  xpi: 'xpi'
};

export function createFactory(
  options: WalletModuleOptions,
  config: ConfigService,
  redis: Redis,
  chronikClients: ChronikClients,
  XPI: BCHJS
): WalletServices {
  const services: { [currency: string]: WalletService } = {};
  for (const currency of options.currencies) {
    const coin = currencyToCoin[currency];
    const chronikClient = chronikClients[coin];

    switch (currency) {
      case 'xec':
        services[currency] = new XecWalletService(XPI, coin, redis, chronikClient);
        break;
      case 'xpi':
        services[currency] = new XpiWalletService(XPI, coin, redis, chronikClient);
        break;
      default:
        break;
    }
  }
  return services;
}

export function createAsyncProviders(options: WalletModuleAsyncOptions): Provider[] {
  if (options.useExisting || options.useFactory) {
    return [createAsyncOptionsProvider(options)];
  }
  const useClass = options.useClass as Type<WalletModuleOptionsFactory>;
  return [
    createAsyncOptionsProvider(options),
    {
      provide: useClass,
      useClass
    }
  ];
}

export function createAsyncOptionsProvider(options: WalletModuleAsyncOptions): Provider {
  if (options.useFactory) {
    return {
      provide: WALLET_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || []
    };
  }
  return {
    provide: WALLET_MODULE_OPTIONS,
    useFactory: async (optionsFactory: WalletModuleOptionsFactory) => await optionsFactory.createChronikOptions(),
    inject: [(options.useClass || options.useExisting) as Type<WalletModuleOptionsFactory>]
  };
}
