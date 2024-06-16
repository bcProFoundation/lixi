import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { fromCoinToSatoshis, fromSmallestDenomination } from '../utils/cashMethods';
import BigNumber from 'bignumber.js';
import { ChronikClient, Utxo } from 'chronik-client';
import intl from 'react-intl-universal';

const wif = require('wif');

import {
  ALL_BIP143,
  Ecc,
  P2PKHSignatory,
  Script,
  TxBuilder,
  TxBuilderOutput,
  fromHex,
  initWasm,
  shaRmd160,
  toHex
} from 'ecash-lib';

export default function useXEC() {
  const sendXec = async (
    chronik: ChronikClient,
    fundingWif: string,
    utxos: Array<Utxo & { address: string }>,
    feeInSatsPerByte: number,
    optionalOpReturnMsg: string | undefined,
    isOneToMany: boolean,
    destinationHashAndValueArray: Array<string> | null,
    destinationHash: string,
    sendSingleAmount: number,
    dustFee: number,
    returnHex?: boolean
  ) => {
    try {
      if (
        !chronik ||
        (isOneToMany && !destinationHashAndValueArray) ||
        (!isOneToMany && !destinationHash && !sendSingleAmount) ||
        !fundingWif ||
        !utxos ||
        !feeInSatsPerByte ||
        !dustFee
      ) {
        throw new Error('Invalid tx send xec');
      }

      const amountToSend = fromCoinToSatoshis(BigNumber(sendSingleAmount), coinInfo[COIN.XEC].cashDecimals);
      //check amount greater dust
      if (!isOneToMany) {
        if (!amountToSend) throw new Error('Invalid value');
        if (sendSingleAmount < fromSmallestDenomination(coinInfo[COIN.XEC].etokenSats, COIN.XEC)) {
          // Throw the same error given by the backend attempting to broadcast such a tx
          throw new Error('dust');
        }
      }

      await initWasm();
      // Build a signature context for elliptic curve cryptography (ECC)
      const ecc = new Ecc();

      //get private key from wif
      const decodedWif = wif.decode(fundingWif);
      const { privateKey } = decodedWif;
      const sk = Buffer.from(privateKey).toString('hex');

      const walletSk = fromHex(sk);
      const walletPk = ecc.derivePubkey(walletSk);
      const walletPkh = shaRmd160(walletPk);
      const walletP2pkh = Script.p2pkh(walletPkh);

      const recipientP2pkh = Script.p2pkh(fromHex(destinationHash));
      // TxId with unspent funds for the above wallet

      let outputsToMany = [];
      if (isOneToMany) {
        outputsToMany = destinationHashAndValueArray.map(hashValue => {
          const value = hashValue.split(',')[1];
          const hash = hashValue.split(',')[0];
          return {
            value: value,
            script: Script.p2pkh(fromHex(hash))
          };
        });
        outputsToMany.push(walletP2pkh);
      }

      const outputs: TxBuilderOutput[] = isOneToMany
        ? outputsToMany
        : [
            {
              value: Number.parseFloat(amountToSend.toString()),
              script: recipientP2pkh
            },
            walletP2pkh
          ];

      // Tx builder
      const txBuild = new TxBuilder({
        inputs: utxos.map(utxo => ({
          input: {
            prevOut: utxo.outpoint,
            signData: {
              value: Number(utxo.value),
              outputScript: walletP2pkh
            }
          },
          signatory: P2PKHSignatory(walletSk, walletPk, ALL_BIP143)
        })),
        outputs: outputs
      });

      const feeInSatsPerKByte = feeInSatsPerByte * 1000;
      const tx = txBuild.sign(ecc, feeInSatsPerKByte, dustFee);
      const rawTx = tx.ser();

      if (returnHex) {
        return toHex(rawTx);
      } else {
        console.log((await chronik.broadcastTx(rawTx)).txid);
        return;
      }
    } catch (err) {
      throw new Error(err);
    }
  };

  return {
    sendXec
  } as const;
}
