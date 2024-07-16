import { cashaddrToHash160, fromCoinToSatoshis, fromSmallestDenomination } from './cashMethods';
// import ecies from 'ecies-lite';
import BigNumber from 'bignumber.js';
import { ChronikClient, Utxo } from 'chronik-client';
import { COIN, coinInfo } from '@bcpros/lixi-models';
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

const wif = require('wif');

export const getRecipientPublicKey = async (
  chronik: ChronikClient,
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
    recipientAddressHash160 = cashaddrToHash160(recipientAddress);
  } catch (err) {
    console.log(`Error determining cashaddrToHash160(${recipientAddress} in getRecipientPublicKey())`, err);
    throw new Error(`Error determining cashaddrToHash160(${recipientAddress} in getRecipientPublicKey())`);
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
      if (thisInputSendingHash160?.includes(recipientAddressHash160)) {
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
      if (sendSingleAmount < fromSmallestDenomination(coinInfo[COIN.XEC].etokenSats, coinInfo[COIN.XEC].cashDecimals)) {
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
    const tx = txBuild.sign(ecc, feeInSatsPerKByte, dustFee);
    const rawTx = tx.ser();

    if (returnHex) {
      return toHex(rawTx);
    } else {
      console.log((await chronik.broadcastTx(rawTx)).txid);
      return;
    }
  } catch (err) {
    throw new Error(err as string);
  }
};
