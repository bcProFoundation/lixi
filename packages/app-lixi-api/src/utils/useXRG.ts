import { cashaddrToHash160, fromCoinToSatoshis, fromSmallestDenomination } from './cashMethods';
// import ecies from 'ecies-lite';
import BigNumber from 'bignumber.js';
import { ChronikClient, Utxo } from 'chronik-client';
import { BurnForType, BurnType, COIN, coinInfo } from '@bcpros/lixi-models';
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
import { generateBurnOpReturnScript } from './opReturnBurn';

const wif = require('wif');

export default function useXRG() {
  const sendXrg = async (
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
        throw new Error('Invalid tx send xrg');
      }

      const amountToSend = fromCoinToSatoshis(BigNumber(sendSingleAmount), coinInfo[COIN.XRG].microCashDecimals);
      //check amount greater dust
      if (!isOneToMany) {
        if (!amountToSend) throw new Error('Invalid value');
        if (
          sendSingleAmount <
          fromSmallestDenomination(coinInfo[COIN.XRG].etokenSats, coinInfo[COIN.XRG].microCashDecimals)
        ) {
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

      let outputsToMany: any = [];
      if (isOneToMany) {
        outputsToMany = destinationHashAndValueArray?.map(hashValue => {
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
      const roundedFeeInSatsPerKByte = parseInt(feeInSatsPerKByte.toFixed(0));
      const tx = txBuild.sign(ecc, roundedFeeInSatsPerKByte, dustFee);
      const rawTx = tx.ser();

      let broadcastResponse;
      if (returnHex) {
        return toHex(rawTx);
      } else {
        try {
          broadcastResponse = await chronik.broadcastTx(rawTx);
          if (!broadcastResponse) {
            throw new Error('Empty chronik broadcast response');
          }
        } catch (err) {
          console.log('Error broadcasting tx to chronik client');
          throw err;
        }
        // return the explorer link for the broadcasted tx
        return `${coinInfo[COIN.XRG].blockExplorerUrl}/tx/${broadcastResponse.txid}`;
      }
    } catch (err: any) {
      throw new Error(err);
    }
  };

  const createBurnTransaction = async (
    fundingWif: string,
    utxos: Array<Utxo & { address: string }>,
    feeInSatsPerByte: number,
    burnType: BurnType,
    burnForType: BurnForType,
    burnedBy: string | Buffer,
    burnForId: string,
    burnAmount: number,
    dustFee: number,
    tipToHashes?: { hash: string; amount: string }[]
  ) => {
    try {
      if (
        !fundingWif ||
        !utxos ||
        !feeInSatsPerByte ||
        !burnType.toString() || //burn type have value 0
        !burnForType ||
        !burnedBy ||
        !burnForId ||
        !burnAmount ||
        !dustFee
      ) {
        throw new Error('Invalid tx send xrg');
      }

      const satoshisToBurn = fromCoinToSatoshis(BigNumber(burnAmount), coinInfo[COIN.XRG].microCashDecimals);

      // Throw validation error if fromCoinToSatoshis returns false
      if (!satoshisToBurn) {
        const error = new Error(`Invalid burn amount`);
        throw error;
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

      // TxId with unspent funds for the above wallet
      const numberSatoshiToBurn = Number.parseFloat(satoshisToBurn.toString());
      let outputsToMany: any = [];
      if (tipToHashes) {
        outputsToMany = tipToHashes.map(hashValue => {
          const value = Number(hashValue.amount);
          const hash = hashValue.hash;
          return {
            value: value,
            script: Script.p2pkh(fromHex(hash))
          };
        });
      }

      const scriptBurnBuff = generateBurnOpReturnScript(
        0x01,
        burnType ? true : false,
        burnForType,
        burnedBy,
        burnForId
      );
      const scriptBurn = new Script(new Uint8Array(scriptBurnBuff));

      const outputs: TxBuilderOutput[] =
        tipToHashes && tipToHashes.length > 0
          ? [
              {
                value: numberSatoshiToBurn,
                script: scriptBurn
              },
              ...outputsToMany,
              walletP2pkh
            ]
          : [
              {
                value: numberSatoshiToBurn,
                script: scriptBurn
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

      const feeInSatsPerKByte = parseInt((feeInSatsPerByte * 1000).toFixed(0));
      const tx = txBuild.sign(ecc, feeInSatsPerKByte, dustFee);
      const rawTx = tx.ser();
      const rawTxHex = toHex(rawTx);

      //calculate minerFee
      let totalInput = new BigNumber(0);
      let totalOutput = new BigNumber(0);
      tx.inputs.forEach(input => {
        totalInput = totalInput.plus(Number(input?.signData?.value ?? 0));
      });
      tx.outputs.forEach(output => {
        totalOutput = totalOutput.plus(Number(output.value));
      });
      const minerFee = totalInput.minus(totalOutput);

      return { rawTxHex, minerFee };
    } catch (err: any) {
      throw new Error(err);
    }
  };

  return {
    sendXrg,
    createBurnTransaction
  } as const;
}
