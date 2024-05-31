import {
  fromCoinToSatoshis,
  cashaddrToHash160,
  fromSatoshisToCoin,
  sumOneToManyXec,
  generateXecTxInput,
  generateXecTxOutput,
  signAndBuildXecTx,
  getChangeAddressFromInputUtxosXec
} from '@utils/cashMethods';
import * as utxolib from '@bitgo/utxo-lib';
import BigNumber from 'bignumber.js';
import { ChronikClient, Utxo } from 'chronik-client';
import intl from 'react-intl-universal';
import { coinInfo, COIN } from '@bcpros/lixi-models';

export default function useXEC() {
  const sendXec = async (
    chronik: ChronikClient,
    wallet: any,
    utxos: Array<Utxo & { address: string }>,
    feeInSatsPerByte: number,
    optionalOpReturnMsg: string | undefined,
    isOneToMany: boolean,
    destinationAddressAndValueArray: Array<string> | null,
    destinationAddress: string,
    sendAmount: string
  ) => {
    try {
      // Validation for missing sendAmount in one to one tx
      // TODO clean this up and have separate functions for one-to-one and one-to-many sends
      if (!isOneToMany && sendAmount === null) {
        throw new Error('Invalid singleSendValue');
      }

      let txBuilder = utxolib.bitgo.createTransactionBuilderForNetwork(utxolib.networks.ecash);

      // parse the input value of XEC to send
      // TODO deprecate BigNumber from the rest of the functions here and in Cashtab
      const value = isOneToMany
        ? new BigNumber(sumOneToManyXec(destinationAddressAndValueArray))
        : new BigNumber(sendAmount);

      // If you have a dust value, throw error here instead of broadcasting the tx and getting it from the node
      if (value.lt(fromSatoshisToCoin(coinInfo[COIN.XEC].etokenSats), coinInfo[COIN.XEC].cashDecimals)) {
        // Throw the same error given by the backend attempting to broadcast such a tx
        throw new Error('dust');
      }

      const satoshisToSend = fromCoinToSatoshis(value, coinInfo[COIN.XEC].cashDecimals);

      // Throw validation error if fromXecToSatoshis returns false
      if (!satoshisToSend) {
        const error = new Error(`Invalid decimal places for send amount`);
        throw error;
      }

      let opReturnByteCount;

      // generate the tx inputs and add to txBuilder instance
      // returns the updated txBuilder, txFee, totalInputUtxoValue and inputUtxos
      let txInputObj = generateXecTxInput(
        isOneToMany,
        utxos,
        txBuilder,
        destinationAddressAndValueArray,
        satoshisToSend,
        feeInSatsPerByte,
        opReturnByteCount
      );

      const changeAddress = getChangeAddressFromInputUtxosXec(txInputObj.inputUtxos, wallet);
      txBuilder = txInputObj.txBuilder; // update the local txBuilder with the generated tx inputs

      // generate the tx outputs and add to txBuilder instance
      // returns the updated txBuilder
      const txOutputObj = generateXecTxOutput(
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
      const rawTxHex = signAndBuildXecTx(txInputObj.inputUtxos, txBuilder, wallet);

      // Broadcast transaction to the network via the chronik client
      // sample chronik.broadcastTx() response:
      //    {"txid":"0075130c9ecb342b5162bb1a8a870e69c935ea0c9b2353a967cda404401acf19"}
      let broadcastResponse;
      try {
        broadcastResponse = await chronik.broadcastTx(rawTxHex);
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
      } catch (err) {
        console.log('Error broadcasting tx to chronik client');
        throw err;
      }

      // return rawTxHex;
      return rawTxHex;
    } catch (err: any) {
      if (err.error === 'insufficient priority (code 66)') {
        err = new Error(intl.get('send.insufficientPriority'));
      } else if (err.error === 'txn-mempool-conflict (code 18)') {
        err = new Error('txn-mempool-conflict');
      } else if (err.error === 'Network Error') {
        err = new Error(intl.get('send.networkError'));
      } else if (err.error === 'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)') {
        err = new Error(intl.get('send.longMempoolChain'));
      }
      throw err;
    }
  };

  return {
    sendXec
  } as const;
}
