import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChronikClient } from 'chronik-client';
import Redis from 'ioredis';
import { getUtxoWif, fromXpiToSatoshis } from 'src/utils/cashMethods';
import useXPI from 'src/utils/useXPI';
import { XPIJS } from './wallet.constants';
import BCHJS from '@bcpros/xpi-js';
import { WalletPathAddressInfo, Hash160AndAddress } from '@bcpros/lixi-models';
import { currency } from 'src/utils/constants';
import { BurnCommand } from '@bcpros/lixi-models';
import BigNumber from 'bignumber.js';
import { WalletService } from './wallet.service';

@Injectable()
export class XpiWalletService extends WalletService {
  public logger: Logger = new Logger(XpiWalletService.name);
  private defaultPath = "m/44'/10605'/0'/0/0";

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

  calcFee(XPI: BCHJS, utxos: any, p2pkhOutputNumber?: number, satoshisPerByte?: number): number {
    return super.calcFee(XPI, utxos, p2pkhOutputNumber, satoshisPerByte);
  }

  async onMax(address: string): Promise<string> {
    return super.onMax(address);
  }

  async deriveAddress(
    mnemonic: string,
    vaultIndex: number
  ): Promise<{ address: any; xpriv: any; wifKey: any; publicKey: any; keyPair: any; balance: string }> {
    return super.deriveAddress(mnemonic, vaultIndex);
  }

  async getBalances(address: string) {
    return super.getBalances(address);
  }

  async createSendHex(sendWalletPath: WalletPathAddressInfo[], recieveAddress: string, amount: number) {
    const { sendXpi } = useXPI();

    const hash160AndAddressObjArray: Hash160AndAddress[] = sendWalletPath.map(item => {
      return {
        address: item.xAddress,
        hash160: item.hash160
      };
    });
    const walletStatus = await super.getWalletStatus(hash160AndAddressObjArray);
    const { slpBalancesAndUtxos } = walletStatus;

    const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], sendWalletPath);
    const hex = await sendXpi(
      this.XPI,
      this.chronik,
      sendWalletPath,
      slpBalancesAndUtxos.nonSlpUtxos,
      currency.defaultFee,
      undefined,
      false, // indicate send mode is one to one
      null,
      recieveAddress,
      amount.toString(),
      true,
      fundingWif,
      true
    );

    return hex;
  }

  async createSendMultipleHex(sendWalletPath: WalletPathAddressInfo[], destinationAddressAndValueArray: string[]) {
    const { sendXpi } = useXPI();

    const hash160AndAddressObjArray: Hash160AndAddress[] = sendWalletPath.map(item => {
      return {
        address: item.xAddress,
        hash160: item.hash160
      };
    });
    const walletStatus = await super.getWalletStatus(hash160AndAddressObjArray);
    const { slpBalancesAndUtxos } = walletStatus;

    const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], sendWalletPath);
    const hex = await sendXpi(
      this.XPI,
      this.chronik,
      sendWalletPath,
      slpBalancesAndUtxos.nonSlpUtxos,
      currency.defaultFee,
      '',
      true, // indicate send mode is one to one
      destinationAddressAndValueArray,
      '',
      '',
      true,
      fundingWif,
      true
    );

    return hex;
  }

  async sendXPIToSingleAddress(
    sourceAddress: string,
    destinationAddress: string,
    sendAmount: string,
    walletPath?: any,
    sourceFundingWif?: any,
    mnemonic?: string
  ) {
    const walletPaths = walletPath ? [walletPath] : await super.getWalletPathDetails(mnemonic!, [this.defaultPath]);
    const sendHex = await this.createSendHex(walletPaths, destinationAddress, parseFloat(sendAmount));
    const broadcastResponse = await this.chronik.broadcastTx(sendHex);
    if (!broadcastResponse) {
      throw new Error('Empty chronik broadcast response');
    }
    const { txid } = broadcastResponse;
    return txid;
  }

  async sendXPIToMultipleAddress(
    sourceAddress: string,
    destinationAddressAndValueArray: string[],
    walletPath?: any,
    sourceFundingWif?: any,
    mnemonic?: string
  ) {
    const walletPaths = walletPath ? [walletPath] : await super.getWalletPathDetails(mnemonic!, [this.defaultPath]);
    const sendHex = await this.createSendMultipleHex(walletPaths, destinationAddressAndValueArray);
    const broadcastResponse = await this.chronik.broadcastTx(sendHex);
    if (!broadcastResponse) {
      throw new Error('Empty chronik broadcast response');
    }
    const { txid } = broadcastResponse;
    return txid;
  }

  async burn(sendAddressMnemonic: string, recieveAddress: string, amount: number, burnCommand: BurnCommand) {
    const { createBurnTransaction } = useXPI();
    const { burnType, burnForType, burnForId, burnedBy } = burnCommand;
    let tipToAddresses: { address: string; amount: string }[] = [];

    try {
      const sendWalletPath = await super.getWalletPathDetails(sendAddressMnemonic, [this.defaultPath]);
      const hash160AndAddressObjArray: Hash160AndAddress[] = sendWalletPath.map(item => {
        return {
          address: item.xAddress,
          hash160: item.hash160
        };
      });
      const walletStatus = await super.getWalletStatus(hash160AndAddressObjArray);
      const { slpBalancesAndUtxos } = walletStatus;

      tipToAddresses.push({
        address: recieveAddress,
        amount: fromXpiToSatoshis(new BigNumber(amount).multipliedBy(currency.burnFee)).valueOf().toString()
      });

      const { rawTxHex } = createBurnTransaction(
        this.XPI,
        sendWalletPath,
        slpBalancesAndUtxos.nonSlpUtxos,
        currency.defaultFee,
        burnType,
        burnForType,
        burnedBy,
        burnForId,
        amount.toString(),
        tipToAddresses
      );

      const broadcastResponse = await this.chronik.broadcastTx(rawTxHex).catch(async err => {
        const updatingWalletFund = 'Updating wallet fund';
        throw new Error(updatingWalletFund);
      });
      const { txid } = broadcastResponse;

      return txid;
    } catch (e: any) {
      this.logger.log(e);
      throw new Error(e.message);
    }
  }
}
