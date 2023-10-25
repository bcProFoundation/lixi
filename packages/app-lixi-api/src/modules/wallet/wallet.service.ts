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
  private logger: Logger = new Logger(WalletService.name);
  private defaultPath = "m/44'/10605'/0'/0/0";

  constructor(
    @Inject(XPIJS) private readonly XPI: BCHJS,
    private chronik: ChronikClient,
    private coin: string,
    private redis: Redis
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

  private async getWalletStatus(hash160AndAddressObjArray: Hash160AndAddress[]) {
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

  async sendXpi(
    XPI: BCHJS,
    chronik: ChronikClient,
    walletPaths: WalletPathAddressInfo[],
    utxos: Array<Utxo & { address: string }>,
    feeInSatsPerByte: number,
    optionalOpReturnMsg: string,
    isOneToMany: boolean,
    destinationAddressAndValueArray: Array<string>,
    destinationAddress: string,
    sendAmount: string,
    encryptionFlag: boolean,
    fundingWif: string,
    returnHex?: boolean
  ) {
    try {
      let txBuilder = new XPI.TransactionBuilder();

      // parse the input value of XPIs to send
      const value = parseXpiSendValue(isOneToMany, sendAmount, destinationAddressAndValueArray);

      const satoshisToSend = fromXpiToSatoshis(value);

      // Throw validation error if fromXecToSatoshis returns false
      if (!satoshisToSend) {
        const error = new Error(`Invalid decimal places for send amount`);
        throw error;
      }

      let encryptedEj: Uint8Array; // serialized encryption data object

      if (!returnHex) {
        // if the user has opted to encrypt this message
        if (encryptionFlag && optionalOpReturnMsg) {
          try {
            // get the pub key for the recipient address
            const recipientPubKey = await getRecipientPublicKey(XPI, chronik, destinationAddress);
            // if the API can't find a pub key, it is due to the wallet having no outbound tx
            if (!recipientPubKey) {
              throw new Error('Cannot send an encrypted message to a wallet with no outgoing transactions');
            }
            if (recipientPubKey) {
              encryptedEj = encryptOpReturnMsg(fundingWif, recipientPubKey, optionalOpReturnMsg);
            }
          } catch (err) {
            console.log(`sendXpi() encryption error.`);
            throw err;
          }
        }

        // Start of building the OP_RETURN output.
        // Only build the OP_RETURN output if the user supplied it
        if (optionalOpReturnMsg && typeof optionalOpReturnMsg !== 'undefined' && optionalOpReturnMsg.trim() !== '') {
          const opReturnData = generateOpReturnScript(XPI, optionalOpReturnMsg, encryptionFlag, encryptedEj!);
          txBuilder.addOutput(opReturnData, 0);
        }
      }

      // generate the tx inputs and add to txBuilder instance
      // returns the updated txBuilder, txFee, totalInputUtxoValue and inputUtxos
      const txInputObj = generateTxInput(
        XPI,
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte
      );

      const changeAddress = getChangeAddressFromInputUtxos(XPI, txInputObj.inputUtxos);

      txBuilder = txInputObj.txBuilder; // update the local txBuilder with the generated tx inputs

      // generate the tx outputs and add to txBuilder instance
      // returns the updated txBuilder
      const txOutputObj = generateTxOutput(
        XPI,
        isOneToMany,
        value,
        satoshisToSend,
        txInputObj.totalInputUtxoValue,
        destinationAddress,
        destinationAddressAndValueArray,
        changeAddress,
        txInputObj.txFee,
        txBuilder
      );
      txBuilder = txOutputObj; // update the local txBuilder with the generated tx outputs

      // sign the collated inputUtxos and build the raw tx hex
      // returns the raw tx hex string
      const rawTxHex = signAndBuildTx(XPI, txInputObj.inputUtxos, txBuilder, walletPaths);

      // Broadcast transaction to the network via the chronik client
      let broadcastResponse;
      try {
        broadcastResponse = await chronik.broadcastTx(rawTxHex);
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
      } catch (err) {
        this.logger.error('Error broadcasting tx to chronik client');
        this.logger.error(err);
        throw err;
      }

      if (returnHex) {
        return rawTxHex;
      } else {
        // return the explorer link for the broadcasted tx
        return `${currency.blockExplorerUrl}/tx/${broadcastResponse.txid}`;
      }
    } catch (err: any) {
      this.logger.error(err);
      throw err;
    }
  }

  async sendXPIToSingleAddress(
    sourceAddress: string,
    destinationAddress: string,
    sendAmount: string,
    walletPath?: any,
    sourceFundingWif?: any,
    mnemonic?: string
  ) {
    const hash = this.XPI.Address.toHash160(sourceAddress);
    const walletStatus = await this.getWalletStatus([
      {
        address: sourceAddress,
        hash160: hash
      }
    ]);
    const { slpBalancesAndUtxos } = walletStatus;

    const walletPaths = walletPath ? [walletPath] : await this.getWalletPathDetails(mnemonic!, [this.defaultPath]);
    const fundingWif = sourceFundingWif
      ? sourceFundingWif
      : getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);

    const sendHex = await this.sendXpi(
      this.XPI,
      this.chronik,
      walletPaths,
      slpBalancesAndUtxos.nonSlpUtxos,
      currency.defaultFee,
      '',
      false, // indicate send mode is one to one
      [],
      destinationAddress,
      sendAmount,
      true,
      fundingWif,
      true
    );

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
    const hash = this.XPI.Address.toHash160(sourceAddress);
    const walletStatus = await this.getWalletStatus([
      {
        address: sourceAddress,
        hash160: hash
      }
    ]);
    const { slpBalancesAndUtxos } = walletStatus;

    const walletPaths = walletPath ? [walletPath] : await this.getWalletPathDetails(mnemonic!, [this.defaultPath]);
    const fundingWif = sourceFundingWif
      ? sourceFundingWif
      : getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);

    const sendHex = await this.sendXpi(
      this.XPI,
      this.chronik,
      walletPaths,
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

    const broadcastResponse = await this.chronik.broadcastTx(sendHex);
    if (!broadcastResponse) {
      throw new Error('Empty chronik broadcast response');
    }

    const { txid } = broadcastResponse;

    return txid;
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
