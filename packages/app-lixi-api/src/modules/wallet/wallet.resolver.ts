import { Inject, Injectable } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Balances } from '@bcpros/lixi-models';
import { WALLET_SERVICES } from './wallet.constants';
import { WalletService } from './wallet.service';

@Injectable()
@Resolver()
export class WalletResolver {
  constructor(@Inject(WALLET_SERVICES) private walletServices) {}

  @Query(() => Balances)
  async geBalances(@Args('address', { type: () => String }) address: string) {
    const walletService: WalletService = this.walletServices['xpi'];
    const balances: Balances = await walletService.getBalances(address);
    return balances;
  }
}
