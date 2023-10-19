import { Inject, Injectable } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Balances } from '@bcpros/lixi-models';
import { WALLET_SERVICES } from './wallet.constants';
import { WalletService } from './wallet.service';

@Injectable()
@Resolver()
export class WalletResolver {
  constructor(@Inject(WALLET_SERVICES) private walletServices: { [currency: string]: WalletService }) {}

  @Query(() => Balances)
  async getBalances(@Args('address', { type: () => String }) address: string) {
    const walletService = this.walletServices['xpi'];
    const balances: Balances = await walletService.getBalances(address);
    return balances;
  }
}
