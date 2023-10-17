import { Hash160AndAddress, fromSmallestDenomination } from '@bcpros/lixi-models';
import BigNumber from 'bignumber.js';
import { ChronikClient, Tx, TxHistoryPage, Utxo } from 'chronik-client';
import { ParseBurnResult } from './opReturnBurn';
import BCHJS from '@bcpros/xpi-js';

export interface ParsedChronikTx {
  incoming: boolean;
  xpiAmount: string;
  originatingHash160: string;
  opReturnMessage: string;
  isLotusMessage: boolean;
  isEncryptedMessage: boolean;
  decryptionSuccess: boolean;
  replyAddress: string;
  destinationAddress: string;
  // Burn
  isBurn: boolean;
  burnInfo?: ParseBurnResult;
  xpiBurnAmount: string;
}

/* 
Note: chronik.script('p2pkh', hash160).utxos(); is not readily mockable in jest
Hence it is necessary to keep this out of any functions that require unit testing
*/
export const getUtxosSingleHashChronik = async (chronik: ChronikClient, hash160: string): Promise<Array<Utxo>> => {
  // Get utxos at a single address, which chronik takes in as a hash160
  let utxos = [];
  try {
    utxos = await chronik.script('p2pkh', hash160).utxos();
    if (utxos.length === 0) {
      // Chronik returns an empty array if there are no utxos at this hash160
      return [];
    }
    /* Chronik returns an array of with a single object if there are utxos at this hash 160
    [
        {
            outputScript: <hash160>,
            utxos:[{utxo}, {utxo}, ..., {utxo}]
        }
    ]
    */

    // Return only the array of utxos at this address
    return utxos[0].utxos;
  } catch (err) {
    console.log(`Error in chronik.utxos(${hash160})`, err);
  }
  return [];
};

export const getWalletBalanceFromUtxos = (nonSlpUtxos: Utxo[]) => {
  const totalBalanceInSatoshis = nonSlpUtxos.reduce(
    (previousBalance, utxo) => previousBalance.plus(new BigNumber(utxo.value)),
    new BigNumber(0)
  );
  return {
    totalBalanceInSatoshis: totalBalanceInSatoshis.toString(),
    totalBalance: fromSmallestDenomination(totalBalanceInSatoshis).toString()
  };
};

export const returnGetUtxosChronikPromise = (
  chronik: ChronikClient,
  hash160AndAddressObj: Hash160AndAddress
): Promise<Array<Utxo & { address: string }>> => {
  /*
      Chronik thinks in hash160s, but people and wallets think in addresses
      Add the address to each utxo
  */
  return new Promise((resolve, reject) => {
    getUtxosSingleHashChronik(chronik, hash160AndAddressObj.hash160).then(
      result => {
        for (let i = 0; i < result.length; i += 1) {
          const thisUtxo = result[i];
          (thisUtxo as any).address = hash160AndAddressObj.address;
        }
        resolve(result as Array<Utxo & { address: string }>);
      },
      err => {
        reject(err);
      }
    );
  });
};

export const getUtxosChronik = async (
  chronik: ChronikClient,
  hash160sMappedToAddresses: Array<Hash160AndAddress>
): Promise<Array<Utxo & { address: string }>> => {
  /* 
      Chronik only accepts utxo requests for one address at a time
      Construct an array of promises for each address
      Note: Chronik requires the hash160 of an address for this request
  */
  const chronikUtxoPromises: Array<Promise<Array<Utxo & { address: string }>>> = [];
  for (let i = 0; i < hash160sMappedToAddresses.length; i += 1) {
    const thisPromise = returnGetUtxosChronikPromise(chronik, hash160sMappedToAddresses[i]);
    chronikUtxoPromises.push(thisPromise);
  }
  const allUtxos = await Promise.all(chronikUtxoPromises);
  // Since each individual utxo has address information, no need to keep them in distinct arrays
  // Combine into one array of all utxos
  const flatUtxos = allUtxos.flat();
  return flatUtxos;
};

export const organizeUtxosByType = (
  chronikUtxos: Array<Utxo & { address: string }>
): { nonSlpUtxos: Array<Utxo & { address: string }> } => {
  /* 
  Convert chronik utxos (returned by getUtxosChronik function, above) to match 
  shape of existing slpBalancesAndUtxos object
  */

  const nonSlpUtxos = [];
  for (let i = 0; i < chronikUtxos.length; i += 1) {
    // Construct nonSlpUtxos and slpUtxos arrays
    const thisUtxo = chronikUtxos[i];
    if (typeof thisUtxo.slpToken !== 'undefined') {
    } else {
      nonSlpUtxos.push(thisUtxo);
    }
  }

  return { nonSlpUtxos };
};

export const flattenChronikTxHistory = (txHistoryOfAllAddresses: TxHistoryPage[]): Tx[] => {
  // Create an array of all txs

  let flatTxHistoryArray: Tx[] = [];
  for (let i = 0; i < txHistoryOfAllAddresses.length; i += 1) {
    const txHistoryResponseOfThisAddress = txHistoryOfAllAddresses[i];
    const txHistoryOfThisAddress = txHistoryResponseOfThisAddress.txs;
    flatTxHistoryArray = flatTxHistoryArray.concat(txHistoryOfThisAddress);
  }
  return flatTxHistoryArray;
};

export const returnGetTxHistoryChronikPromise = (
  chronik: ChronikClient,
  hash160AndAddressObj: Hash160AndAddress
): Promise<TxHistoryPage> => {
  /*
      Chronik thinks in hash160s, but people and wallets think in addresses
      Add the address to each utxo
  */
  return new Promise((resolve, reject) => {
    chronik
      .script('p2pkh', hash160AndAddressObj.hash160)
      .history(/*page=*/ 0, /*page_size=*/ 40)
      .then(
        result => {
          resolve(result);
        },
        err => {
          reject(err);
        }
      );
  });
};

export const getRecipientPublicKey = async (
  XPI: BCHJS,
  chronik: ChronikClient,
  recipientAddress: string,
  optionalMockPubKeyResponse: string | false = false
): Promise<string | false> => {
  // Necessary because jest can't mock
  // chronikTxHistoryAtAddress = await chronik.script('p2pkh', recipientAddressHash160).history(/*page=*/ 0, /*page_size=*/ 10);
  if (optionalMockPubKeyResponse) {
    return optionalMockPubKeyResponse;
  }

  // get hash160 of address
  let recipientAddressHash160: string = '';
  try {
    recipientAddressHash160 = XPI.Address.toHash160(recipientAddress);
  } catch (err) {
    console.log(`Error determining XPI.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`, err);
    // throw new Error(`Error determining XPI.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`);
  }

  let chronikTxHistoryAtAddress: TxHistoryPage;
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
      if (thisInputSendingHash160!.includes(recipientAddressHash160)) {
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
