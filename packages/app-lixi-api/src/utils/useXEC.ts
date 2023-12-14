import {
  fromXecToSatoshis,
  toHash160,
  fromSatoshisToXec,
  sumOneToManyXec,
  generateXecTxInput,
  generateXecTxOutput,
  signAndBuildXecTx,
  getChangeAddressFromInputUtxosXec
} from './cashMethods';
// import ecies from 'ecies-lite';
import * as utxolib from '@bitgo/utxo-lib';
import BigNumber from 'bignumber.js';
import { SEND_XEC_ERRORS, appConfig } from './xec.constant';
import { ChronikClient, Utxo } from 'chronik-client';

export const getRecipientPublicKey = async (
  chronik: any,
  recipientAddress: string,
  optionalMockPubKeyResponse = false
) => {
  // Necessary because jest can't mock
  // chronikTxHistoryAtAddress = await chronik.script('p2pkh', recipientAddressHash160).history(/*page=*/ 0, /*page_size=*/ 10);
  if (optionalMockPubKeyResponse) {
    return optionalMockPubKeyResponse;
  }

  // get hash160 of address
  let recipientAddressHash160;
  try {
    recipientAddressHash160 = toHash160(recipientAddress);
  } catch (err) {
    console.log(`Error determining toHash160(${recipientAddress} in getRecipientPublicKey())`, err);
    throw new Error(`Error determining toHash160(${recipientAddress} in getRecipientPublicKey())`);
  }

  let chronikTxHistoryAtAddress;
  try {
    // Get 20 txs. If no outgoing txs in those 20 txs, just don't send the tx
    chronikTxHistoryAtAddress = await chronik
      .script('p2pkh', recipientAddressHash160)
      .history(/*page=*/ 0, /*page_size=*/ 20);
  } catch (err) {
    console.log(`Error getting await chronik.script('p2pkh', ${recipientAddressHash160}).history();`, err);
    throw new Error('Error fetching tx history to parse for public key');
  }
  let recipientPubKeyChronik;

  // Iterate over tx history to find an outgoing tx
  for (let i = 0; i < chronikTxHistoryAtAddress.txs.length; i += 1) {
    const { inputs } = chronikTxHistoryAtAddress.txs[i];
    for (let j = 0; j < inputs.length; j += 1) {
      const thisInput = inputs[j];
      const thisInputSendingHash160 = thisInput.outputScript;
      if (thisInputSendingHash160.includes(recipientAddressHash160)) {
        // Then this is an outgoing tx, you can get the public key from this tx
        // Get the public key
        try {
          recipientPubKeyChronik = chronikTxHistoryAtAddress.txs[i].inputs[j].inputScript.slice(-66);
        } catch (err) {
          throw new Error('Cannot send an encrypted message to a wallet with no outgoing transactions');
        }
        return recipientPubKeyChronik;
      }
    }
  }
  // You get here if you find no outgoing txs in the chronik tx history
  throw new Error('Cannot send an encrypted message to a wallet with no outgoing transactions in the last 20 txs');
};

export const sendXec = async (
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
    if (value.lt(fromSatoshisToXec(appConfig.dustSats))) {
      // Throw the same error given by the backend attempting to broadcast such a tx
      throw new Error('dust');
    }

    const satoshisToSend = fromXecToSatoshis(value);

    // Throw validation error if fromXecToSatoshis returns false
    if (!satoshisToSend) {
      const error = new Error(`Invalid decimal places for send amount`);
      throw error;
    }

    let encryptedEj; // serialized encryption data object

    // if the user has opted to encrypt this message
    // if (encryptionFlag) {
    //     try {
    //         // get the pub key for the recipient address
    //         let recipientPubKey = await getRecipientPublicKey(
    //             chronik,
    //             destinationAddress,
    //             optionalMockPubKeyResponse,
    //         );

    //         // if the API can't find a pub key, it is due to the wallet having no outbound tx
    //         if (recipientPubKey === 'not found') {
    //             throw new Error(
    //                 'Cannot send an encrypted message to a wallet with no outgoing transactions',
    //             );
    //         }

    //         // encrypt the message
    //         const pubKeyBuf = Buffer.from(recipientPubKey, 'hex');
    //         const bufferedFile = Buffer.from(optionalOpReturnMsg);
    //         const structuredEj = await ecies.encrypt(
    //             pubKeyBuf,
    //             bufferedFile,
    //             { compressEpk: true },
    //         );

    //         // Serialize the encrypted data object
    //         encryptedEj = Buffer.concat([
    //             structuredEj.epk,
    //             structuredEj.iv,
    //             structuredEj.ct,
    //             structuredEj.mac,
    //         ]);
    //     } catch (err) {
    //         console.log(`sendXec() encryption error.`);
    //         throw err;
    //     }
    // }

    // Start of building the OP_RETURN output.
    // only build the OP_RETURN output if the user supplied it
    // if (
    //     (optionalOpReturnMsg &&
    //         typeof optionalOpReturnMsg !== 'undefined' &&
    //         optionalOpReturnMsg.trim() !== '') ||
    //     airdropFlag
    // ) {
    //     const opReturnData = generateOpReturnScript(
    //         optionalOpReturnMsg,
    //         encryptionFlag,
    //         airdropFlag,
    //         airdropTokenId,
    //         encryptedEj,
    //     );
    //     txBuilder.addOutput(opReturnData, 0);
    // }

    let opReturnByteCount;
    // if (optionalOpReturnMsg) {
    //     opReturnByteCount = getMessageByteSize(
    //         optionalOpReturnMsg,
    //         encryptionFlag,
    //         encryptedEj,
    //     );
    // }

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
      err.code = SEND_XEC_ERRORS.INSUFFICIENT_PRIORITY;
    } else if (err.error === 'txn-mempool-conflict (code 18)') {
      err.code = SEND_XEC_ERRORS.DOUBLE_SPENDING;
    } else if (err.error === 'Network Error') {
      err.code = SEND_XEC_ERRORS.NETWORK_ERROR;
    } else if (err.error === 'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)') {
      err.code = SEND_XEC_ERRORS.MAX_UNCONFIRMED_TXS;
    }
    console.log(`error: `, err);
    throw err;
  }
};
