import BCHJS from '@bcpros/xpi-js';
import { RedisService } from '@songkeys/nestjs-redis';
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import _ from 'lodash';
import { WALLET_MODULE_OPTIONS, WALLET_SERVICES, WALLET_SUPPORT_CURRENCIES, XPIJS } from './wallet.constants';
import { WalletModuleAsyncOptions, WalletModuleOptions, WalletServices } from './wallet.interface';
import { createAsyncProviders, createFactory } from './wallet.providers';
import { WalletResolver } from './wallet.resolver';
import { ChronikClients, CHRONIK_CLIENTS, ChronikClientNodes, CHRONIK_CLIENT_NODES } from 'nestjs-chronik';

@Global()
@Module({})
export class WalletModule {
  public static forRoot(options: WalletModuleOptions, _isGlobal = true): DynamicModule {
    const gitbotOptions: Provider = {
      provide: WALLET_MODULE_OPTIONS,
      useValue: options
    };

    const servicesProvider: Provider = {
      provide: WALLET_SERVICES,
      inject: [ConfigService, RedisService, CHRONIK_CLIENTS, CHRONIK_CLIENT_NODES, XPIJS],
      useFactory: async (
        config: ConfigService,
        redisService: RedisService,
        chronikClients: ChronikClients,
        chronikClientNodes: ChronikClientNodes,
        xpijs: BCHJS
      ) => {
        return await createFactory(
          options,
          config,
          redisService.getClient(),
          chronikClients,
          chronikClientNodes,
          xpijs
        );
      }
    };

    const childrenProviders: Provider[] = [
      {
        provide: XPIJS,
        useFactory: () => {
          return new BCHJS({});
        }
      },
      WalletResolver
    ];
    for (const currency of options.currencies) {
      childrenProviders.push({
        provide: `${WALLET_SERVICES}_${currency}`,
        inject: [WALLET_SERVICES],
        useFactory: (services: WalletServices) => services[currency]
      });
    }

    return {
      module: WalletModule,
      controllers: [],
      providers: [gitbotOptions, servicesProvider, ...childrenProviders],
      exports: [servicesProvider, ...childrenProviders]
    };
  }

  public static forRootAsync(options: WalletModuleAsyncOptions, isGlobal = true): DynamicModule {
    const servicesProvider: Provider = {
      provide: WALLET_SERVICES,
      inject: [WALLET_MODULE_OPTIONS, ConfigService, RedisService, CHRONIK_CLIENTS, CHRONIK_CLIENT_NODES, XPIJS],
      useFactory: async (
        walletOptions: WalletModuleOptions,
        config: ConfigService,
        redisService: RedisService,
        chronikClients: ChronikClients,
        chronikClientNodes: ChronikClientNodes,
        xpijs: BCHJS
      ) => {
        return await createFactory(
          walletOptions,
          config,
          redisService.getClient(),
          chronikClients,
          chronikClientNodes,
          xpijs
        );
      }
    };

    const asyncProviders = createAsyncProviders(options);

    const childrenProviders: Provider[] = [
      {
        provide: XPIJS,
        useFactory: () => {
          return new BCHJS({});
        }
      },
      WalletResolver
    ];
    for (const currency of WALLET_SUPPORT_CURRENCIES) {
      childrenProviders.push({
        provide: `${WALLET_SERVICES}_${currency}`,
        inject: [WALLET_SERVICES, WALLET_MODULE_OPTIONS],
        useFactory: (services: WalletServices, walletOptions: WalletModuleOptions) => {
          if (walletOptions.currencies.includes(currency)) {
            return services[currency];
          }
        }
      });
    }

    return {
      global: isGlobal,
      module: WalletModule,
      imports: options.imports || [],
      controllers: [],
      providers: [...asyncProviders, servicesProvider, ..._.compact(childrenProviders)],
      exports: [servicesProvider, ..._.compact(childrenProviders)]
    };
  }
}
