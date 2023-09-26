import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { WalletService } from './wallet.service';

export interface WalletServices {
  [currency: string]: WalletService;
}

export interface WalletModuleOptions {
  currencies: string[];
}

export interface WalletModuleOptionsFactory {
  createChronikOptions(): Promise<WalletModuleOptions> | WalletModuleOptions;
}

export interface WalletModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<WalletModuleOptionsFactory>;
  useClass?: Type<WalletModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<WalletModuleOptions> | WalletModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
