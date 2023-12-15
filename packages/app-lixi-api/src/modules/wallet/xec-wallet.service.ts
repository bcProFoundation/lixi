import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChronikClient } from 'chronik-client';
import Redis from 'ioredis';
// import { Hash160AndAddress, getUtxosChronik, organizeUtxosByType } from 'src/utils/chronik';
// import { getUtxoWif, getWalletBalanceFromUtxos, fromXpiToSatoshis } from 'src/utils/cashMethods';
// import useXPI from 'src/utils/useXPI';
import { WALLET_SERVICES, XPIJS } from './wallet.constants';
import BCHJS from '@bcpros/xpi-js';
import { WalletPathAddressInfo, Hash160AndAddress } from '@bcpros/lixi-models';
// import { WalletPathAddressInfo } from './wallet.model';
// import { currency } from 'src/utils/constants';
// import { BurnCommand, BurnForType, BurnType } from 'src/model';
// import BigNumber from 'bignumber.js';
// import { sendXec } from 'src/utils/useXEC';
import { WalletService } from './wallet.service';
import { currency } from 'src/utils/constants';
import { sendXec } from 'src/utils/useXEC';

@Injectable()
export class XecWalletService extends WalletService {
  public logger: Logger = new Logger(XecWalletService.name);
  private defaultPath = "m/44'/1899'/0'/0/0";

  constructor(
    @Inject(XPIJS) public readonly XPI: BCHJS,
    private coin: string,
    private redis: Redis,
    public chronik: ChronikClient
  ) {
    super(XPI, chronik);
  }

  async deriveAccount({ masterHDNode, path }: { masterHDNode: any; path: string }) {
    return super.deriveAccount({ masterHDNode, path });
  }

  async send(sendWalletPath: WalletPathAddressInfo[], recieveAddress: string, amount: number) {
    const hash160AndAddressObjArray: Hash160AndAddress[] = sendWalletPath.map(item => {
      return {
        address: item.cashAddress,
        hash160: item.hash160
      };
    });
    const walletStatus = await super.getWalletStatus(hash160AndAddressObjArray);
    const { slpBalancesAndUtxos } = walletStatus;
    const hex = await sendXec(
      this.chronik,
      sendWalletPath,
      slpBalancesAndUtxos.nonSlpUtxos,
      currency.defaultFee,
      undefined,
      false, // indicate send mode is one to many
      null,
      recieveAddress,
      amount.toString()
    );
    return hex;
  }
}
