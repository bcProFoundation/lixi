import BCHJS from '@bcpros/xpi-js';
import BigNumber from 'bignumber.js';
import { ChronikClientNode, TokenInfo, Tx_InNode, TxHistoryPage_InNode, Utxo_InNode } from 'chronik-client';
import { parseBurnOutput, ParseBurnResult } from './opReturnBurn';

export interface Hash160AndAddress {
  address: string;
  hash160: string;
}

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

export type ChronikToken = TokenInfo & {
  circulatingSupply?: number;
  initialTokenQuantity?: number;
  tokenStats?: {
    totalMinted: number;
    totalBurned: number;
  };
};

/* 
Note: chronik.script('p2pkh', hash160).utxos(); is not readily mockable in jest
Hence it is necessary to keep this out of any functions that require unit testing
*/
export const getUtxosSingleHashChronik = async (chronik: ChronikClientNode, hash160: string) => {
  // Get utxos at a single address, which chronik takes in as a hash160
  try {
    const { utxos } = await chronik.script('p2pkh', hash160).utxos();
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
    return utxos;
  } catch (err) {
    console.log(`Error in chronik.utxos(${hash160})`, err);
  }
  return [];
};

export const returnGetUtxosChronikPromise = (
  chronik: ChronikClientNode,
  hash160AndAddressObj: Hash160AndAddress
): Promise<Array<Utxo_InNode & { address: string }>> => {
  /*
      Chronik thinks in hash160s, but people and wallets think in addresses
      Add the address to each utxo
  */
  return new Promise((resolve, reject) => {
    getUtxosSingleHashChronik(chronik, hash160AndAddressObj.hash160).then(
      result => {
        if (!result) reject();
        for (let i = 0; i < result.length; i += 1) {
          const thisUtxo = result[i];
          (thisUtxo as any).address = hash160AndAddressObj.address;
        }
        resolve(result as Array<Utxo_InNode & { address: string }>);
      },
      err => {
        reject(err);
      }
    );
  });
};

export const getUtxosChronik = async (
  chronik: ChronikClientNode,
  hash160sMappedToAddresses: Array<Hash160AndAddress>
): Promise<Array<Utxo_InNode & { address: string }>> => {
  /* 
      Chronik only accepts utxo requests for one address at a time
      Construct an array of promises for each address
      Note: Chronik requires the hash160 of an address for this request
  */
  const chronikUtxoPromises: Array<Promise<Array<Utxo_InNode & { address: string }>>> = [];
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
  chronikUtxos: Array<Utxo_InNode & { address: string }>
): {
  nonSlpUtxos: Array<Utxo_InNode & { address: string }>;
  preliminarySlpUtxos: Array<Utxo_InNode & { address: string }>;
} => {
  /* 
  Convert chronik utxos (returned by getUtxosChronik function, above) to match 
  shape of existing slpBalancesAndUtxos object
  */

  const nonSlpUtxos = [];
  const preliminarySlpUtxos = [];
  for (let i = 0; i < chronikUtxos.length; i += 1) {
    // Construct nonSlpUtxos and slpUtxos arrays
    const thisUtxo = chronikUtxos[i];
    if (typeof thisUtxo.token !== 'undefined') {
      preliminarySlpUtxos.push(thisUtxo);
    } else {
      nonSlpUtxos.push(thisUtxo);
    }
  }

  return { nonSlpUtxos, preliminarySlpUtxos };
};

export const flattenChronikTxHistory = (txHistoryOfAllAddresses: TxHistoryPage_InNode[]): Tx_InNode[] => {
  // Create an array of all txs

  let flatTxHistoryArray: Tx_InNode[] = [];
  for (let i = 0; i < txHistoryOfAllAddresses.length; i += 1) {
    const txHistoryResponseOfThisAddress = txHistoryOfAllAddresses[i];
    const txHistoryOfThisAddress = txHistoryResponseOfThisAddress.txs;
    flatTxHistoryArray = flatTxHistoryArray.concat(txHistoryOfThisAddress);
  }
  return flatTxHistoryArray;
};

// @todo
export const sortAndTrimChronikTxHistory = (flatTxHistoryArray: Tx_InNode[], txHistoryCount: number): Tx_InNode[] => {
  // Isolate unconfirmed txs
  // In chronik, unconfirmed txs have an `undefined` block key
  const unconfirmedTxs = [];
  const confirmedTxs = [];
  for (let i = 0; i < flatTxHistoryArray.length; i += 1) {
    const thisTx = flatTxHistoryArray[i];
    if (typeof thisTx.block === 'undefined') {
      unconfirmedTxs.push(thisTx);
    } else {
      confirmedTxs.push(thisTx);
    }
  }
  // Sort confirmed txs by blockheight, and then timeFirstSeen
  const sortedConfirmedTxHistoryArray = confirmedTxs.sort(
    (a, b) =>
      // We want more recent blocks i.e. higher blockheights to have earlier array indices
      b.block!.height - a.block!.height ||
      // For blocks with the same height, we want more recent timeFirstSeen i.e. higher timeFirstSeen to have earlier array indices
      b.timeFirstSeen - a.timeFirstSeen
  );
  // Sort unconfirmed txs by timeFirstSeen
  const sortedUnconfirmedTxHistoryArray = unconfirmedTxs.sort((a, b) => b.timeFirstSeen - a.timeFirstSeen);
  // The unconfirmed txs are more recent, so they should be inserted into an array before the confirmed txs
  const sortedChronikTxHistoryArray = sortedUnconfirmedTxHistoryArray.concat(sortedConfirmedTxHistoryArray);

  const trimmedAndSortedChronikTxHistoryArray = sortedChronikTxHistoryArray.splice(0, txHistoryCount);

  return trimmedAndSortedChronikTxHistoryArray;
};

export const returnGetTxHistoryChronikPromise = (
  chronik: ChronikClientNode,
  hash160AndAddressObj: Hash160AndAddress
): Promise<TxHistoryPage_InNode> => {
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
  chronik: ChronikClientNode,
  recipientAddress: string,
  optionalMockPubKeyResponse: string | false = false
): Promise<string | false> => {
  // Necessary because jest can't mock
  // chronikTxHistoryAtAddress = await chronik.script('p2pkh', recipientAddressHash160).history(/*page=*/ 0, /*page_size=*/ 10);
  if (optionalMockPubKeyResponse) {
    return optionalMockPubKeyResponse;
  }

  // get hash160 of address
  let recipientAddressHash160;
  try {
    recipientAddressHash160 = XPI.Address.toHash160(recipientAddress);
  } catch (err) {
    console.log(`Error determining XPI.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`, err);
    // throw new Error(`Error determining XPI.Address.toHash160(${recipientAddress} in getRecipientPublicKey())`);
  }

  let chronikTxHistoryAtAddress: TxHistoryPage_InNode;
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
