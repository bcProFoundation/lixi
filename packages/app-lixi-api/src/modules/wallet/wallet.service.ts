import BigNumber from 'bignumber.js';
import * as _ from 'lodash';
import VError from 'verror';

import { WalletPathAddressInfo, currency, fromSmallestDenomination, toSmallestDenomination } from '@bcpros/lixi-models';
import BCHJS from '@bcpros/xpi-js';
import HDNode from '@bcpros/xpi-js/types/hdnode';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChronikClient, Utxo } from 'chronik-client';
import { Redis } from 'ioredis';
import { I18nContext } from 'nestjs-i18n';
import { XPIJS } from './wallet.constants';
import { Hash160AndAddress } from '@bcpros/lixi-models';
import {
  getUtxosChronik,
  getWalletBalanceFromUtxos,
  organizeUtxosByType,
  getRecipientPublicKey
} from '../../utils/chronik';
import {
  calcFee,
  getChangeAddressFromInputUtxos,
  parseXpiSendValue,
  fromXpiToSatoshis,
  encryptOpReturnMsg,
  generateOpReturnScript,
  generateTxInput,
  generateTxOutput,
  signAndBuildTx,
  getUtxoWif
} from '../../utils/cashMethods';
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';

@Injectable()
export class WalletService {
  public logger: Logger = new Logger(WalletService.name);
  constructor(
    @Inject(XPIJS) public readonly XPI: BCHJS,
    public chronik: ChronikClient
  ) {}

  async getBalances(xAddress: string) {
    const hash = this.XPI.Address.toHash160(xAddress);
    const walletStatus = await this.getWalletStatus([
      {
        address: xAddress,
        hash160: hash
      }
    ]);
    const { balances } = walletStatus;
    return balances;
  }

  async getWalletStatus(hash160AndAddressObjArray: Hash160AndAddress[]) {
    const chronikUtxos = await getUtxosChronik(this.chronik, hash160AndAddressObjArray);

    const { nonSlpUtxos } = organizeUtxosByType(chronikUtxos);

    const walletStatus = {
      balances: getWalletBalanceFromUtxos(nonSlpUtxos),
      slpBalancesAndUtxos: {
        nonSlpUtxos
      },
      utxos: chronikUtxos
    };

    return walletStatus;
  }

  async getWalletPathDetails(mnemonic: string, paths: string[]): Promise<WalletPathAddressInfo[]> {
    const rootSeedBuffer = await this.XPI.Mnemonic.toSeed(mnemonic);
    const masterHDNode = this.XPI.HDNode.fromSeed(rootSeedBuffer);
    const walletPaths: WalletPathAddressInfo[] = [];
    for (const path of paths) {
      const walletPath = await this.deriveAccount({
        masterHDNode,
        path: path
      });
      walletPaths.push(walletPath);
    }

    return walletPaths;
  }

  async deriveAccount({ masterHDNode, path }: { masterHDNode: any; path: any }) {
    const node = this.XPI.HDNode.derivePath(masterHDNode, path);
    const cashAddress = this.XPI.HDNode.toCashAddress(node);
    const hash160 = this.XPI.Address.toHash160(cashAddress);
    const slpAddress = this.XPI.SLP.Address.toSLPAddress(cashAddress);
    const xAddress = this.XPI.HDNode.toXAddress(node);
    const publicKey = this.XPI.HDNode.toPublicKey(node).toString('hex');
    return {
      path,
      xAddress,
      cashAddress,
      slpAddress,
      hash160,
      fundingWif: this.XPI.HDNode.toWIF(node),
      fundingAddress: this.XPI.SLP.Address.toSLPAddress(cashAddress),
      legacyAddress: this.XPI.SLP.Address.toLegacyAddress(cashAddress),
      publicKey
    };
  }

  async deriveAddress(mnemonic: string, vaultIndex: number) {
    const rootSeedBuffer: Buffer = await this.XPI.Mnemonic.toSeed(mnemonic);
    const masterHDNode = this.XPI.HDNode.fromSeed(rootSeedBuffer);
    const hdPath = `m/44'/10605'/${vaultIndex}'/0/0`;
    const childNode: HDNode = this.XPI.HDNode.derivePath(masterHDNode, hdPath);
    const xAddress = this.XPI.HDNode.toXAddress(childNode);
    const xpriv = this.XPI.HDNode.toXPriv(childNode);
    const wif = this.XPI.HDNode.toWIF(childNode);
    const publicKey = this.XPI.HDNode.toPublicKey(childNode).toString('hex');
    const keyPair = this.XPI.HDNode.toKeyPair(childNode);

    const balance = await this.getBalances(xAddress);

    return {
      address: xAddress,
      xpriv: xpriv,
      wifKey: wif,
      publicKey: publicKey,
      keyPair: keyPair,
      balance: balance.totalBalance
    };
  }

  calcFee(XPI: BCHJS, utxos: any, p2pkhOutputNumber = 2, satoshisPerByte = 2.01) {
    const byteCount = XPI.BitcoinCash.getByteCount({ P2PKH: utxos.length }, { P2PKH: p2pkhOutputNumber });
    const txFee = Math.ceil(satoshisPerByte * byteCount);
    return txFee;
  }

  async onMax(address: string) {
    const hash = this.XPI.Address.toHash160(address);
    const walletStatus = await this.getWalletStatus([
      {
        address: address,
        hash160: hash
      }
    ]);
    const { slpBalancesAndUtxos, balances } = walletStatus;
    const txFeeSats = calcFee(slpBalancesAndUtxos.nonSlpUtxos);
    const txFeeXpi = txFeeSats / 10 ** currency.cashDecimals;

    let value =
      _.toNumber(balances.totalBalance) - txFeeXpi >= 0
        ? (_.toNumber(balances.totalBalance) - txFeeXpi).toFixed(currency.cashDecimals)
        : 0;

    value = value.toString();

    return value;
  }

  async validateMnemonic(mnemonic: string, wordlist = this.XPI.Mnemonic.wordLists().english) {
    let mnemonicTestOutput;

    try {
      mnemonicTestOutput = await this.XPI.Mnemonic.validate(mnemonic, wordlist);

      if (mnemonicTestOutput === 'Valid mnemonic') {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }
}
