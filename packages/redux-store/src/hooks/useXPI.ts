import { BurnForType, BurnType } from '@bcpros/lixi-models/lib/burn/burn.model';
import BCHJS from '@bcpros/xpi-js';
import {
  encryptOpReturnMsg,
  fromCoinToSatoshis,
  fromSmallestDenomination,
  generateOpReturnScript
} from '../utils/cashMethods';
import { getRecipientPublicKey } from '../utils/chronik';
import { generateBurnOpReturnScript } from '../utils/opReturnBurn';
import BigNumber from 'bignumber.js';
import { ChronikClient, Utxo } from 'chronik-client';
import { convertHashToXAddress } from '../utils/addressMethods';

import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';

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

export default function useXPI() {
  const getXPI = (apiIndex = 0): BCHJS => {
    return new BCHJS({});
    return new BCHJS({});
  };

  const calcFee = (XPI: BCHJS, utxos: any, p2pkhOutputNumber = 2, satoshisPerByte = 2.01, opReturnLength = 0) => {
    const byteCount = XPI.BitcoinCash.getByteCount({ P2PKH: utxos.length }, { P2PKH: p2pkhOutputNumber });
    // 8 bytes : the output's value
    // 1 bytes : Locking-Script Size
    // opReturnLength: the size of the OP_RETURN script
    // Referece
    // https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch06.asciidoc#transaction-serializationoutputs
    //
    // Technically, Locking-Script Size can be 1, 3, 5 or 9 bytes, But
    //  - Lotus Node's default allowed OP_RETURN length is set the 223 bytes
    //  - SendLotus max OP_RETURN length is also limited to 223 bytes
    // We can safely assume it is 1 byte (0 - 252. fd, fe, ff are special)
    //
    // The Output Count field is of VarInt (1, 3, 5 or 9 bytes), which indicates the number of outputs present in the transaction
    // Adding OP_RETURNs to the outputs increases the count
    // Since SendLotus only allows single recipient transaction, the maxium number of outputs in a tx is 5
    //  - one for recipient
    //  - one for change
    //  - maximum 3 for OP_RETURNs
    // So we can safely assume the Output will only take 1 byte.
    //
    // In wallet where multiple recipients are allowed in a transaction
    // adding extra OP_RETURN outputs may change the output count from 1 byte to 3 bytes
    // this would affect the fee
    let opReturnOutputByteLength = opReturnLength;
    if (opReturnLength) {
      opReturnOutputByteLength += 8 + 1;
    }
    const txFee = Math.ceil(satoshisPerByte * byteCount);
    return txFee;
  };

  const sendXpi = async (
    XPI: BCHJS,
    chronik: ChronikClient,
    fundingWif: string,
    utxos: Array<Utxo & { address: string }>,
    feeInSatsPerByte: number,
    optionalOpReturnMsg: string | undefined,
    encryptionFlag: boolean,
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
        throw new Error('Invalid tx send xpi');
      }

      const amountToSend = fromCoinToSatoshis(BigNumber(sendSingleAmount), coinInfo[COIN.XPI].cashDecimals);
      //check amount greater dust
      if (!isOneToMany) {
        if (!amountToSend) throw new Error('Invalid value');
        if (sendSingleAmount < fromSmallestDenomination(coinInfo[COIN.XPI].etokenSats, COIN.XPI)) {
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

      let encryptedEj: Uint8Array; // serialized encryption data object
      let opReturnOutput: any;

      if (!returnHex) {
        // if the user has opted to encrypt this message
        if (encryptionFlag && optionalOpReturnMsg) {
          try {
            // get the pub key for the recipient address
            const destinationAddress = convertHashToXAddress(XPI, destinationHash);
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
          const opReturnData = generateOpReturnScript(XPI, optionalOpReturnMsg, encryptionFlag, encryptedEj);
          opReturnOutput = { script: new Script(opReturnData), value: 0 };
        }
      }

      let outputs = [];
      if (isOneToMany) {
        //check opreturn
        if (opReturnOutput) {
          outputs.push(opReturnOutput);
        }

        //add output send
        destinationHashAndValueArray.map(hashValue => {
          const value = hashValue.split(',')[1];
          const hash = hashValue.split(',')[0];
          outputs.push({
            value: value,
            script: Script.p2pkh(fromHex(hash))
          });
        });
        //add change address
        outputs.push(walletP2pkh);
      } else {
        //check opreturn
        if (opReturnOutput) {
          outputs.push(opReturnOutput);
        }

        //add output send and change address
        outputs.push(
          {
            value: Number.parseFloat(amountToSend.toString()),
            script: recipientP2pkh
          },
          walletP2pkh
        );
      }
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
        return `${coinInfo[COIN.XPI].blockExplorerUrl}/tx/${broadcastResponse.txid}`;
      }
    } catch (err) {
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
        !burnType ||
        !burnForType ||
        !burnedBy ||
        !burnForId ||
        !burnAmount ||
        !dustFee
      ) {
        throw new Error('Invalid tx send xpi');
      }

      const satoshisToBurn = fromCoinToSatoshis(BigNumber(burnAmount), coinInfo[COIN.XPI].cashDecimals);

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
      let outputsToMany = [];
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
        tipToHashes.length > 0
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
        totalInput = totalInput.plus(Number(input.signData.value));
      });
      tx.outputs.forEach(output => {
        totalOutput = totalOutput.plus(Number(output.value));
      });
      const minerFee = totalInput.minus(totalOutput);

      return { rawTxHex, minerFee };
    } catch (err) {
      throw new Error(err);
    }
  };

  return {
    getXPI,
    calcFee,
    sendXpi,
    createBurnTransaction
  } as const;
}
