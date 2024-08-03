import BigNumber from 'bignumber.js';
import cashaddr from 'ecashaddrjs';
import * as ergonCashaddr from 'ergonaddrjs';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { isValidCoinAddress } from './cashMethods';

export interface AddressInfo {
  address: string;
  isValid: boolean;
  queryString: string;
  amount: number;
}

export function parseAddress(XPI: any, addressString: string, coin = COIN.XPI): AddressInfo {
  const addressInfo: AddressInfo = {
    address: '',
    isValid: false,
    queryString: null,
    amount: null
  };
  // Parse address string for parameters
  const paramCheck = addressString.split('?');
  const cleanAddress = paramCheck[0];
  addressInfo.address = cleanAddress;

  let isValidAddress;

  try {
    switch (coin) {
      case COIN.XPI:
        isValidAddress = XPI.Address.isXAddress(cleanAddress);
        break;
      case COIN.XEC:
        isValidAddress = isValidCoinAddress(COIN.XEC, cleanAddress);
        break;
      case COIN.XRG:
        isValidAddress = isValidCoinAddress(COIN.XRG, cleanAddress);
        break;
    }
  } catch (err) {
    isValidAddress = false;
  }

  addressInfo.isValid = isValidAddress;
  // Check for parameters
  // only the amount param is currently supported
  let queryString = null;
  let amount = null;
  if (paramCheck.length > 1) {
    queryString = paramCheck[1];
    addressInfo.queryString = queryString;

    const addrParams = new URLSearchParams(queryString);

    if (addrParams.has('amount')) {
      // Amount in satoshis
      try {
        amount = new BigNumber(parseInt(addrParams.get('amount')))
          .div(10 ** coinInfo[coin ?? COIN.XPI].cashDecimals)
          .toString();
      } catch (err) {
        amount = null;
      }
    }
  }
  addressInfo.amount = amount;
  return addressInfo;
}

export const parseCashAddressToPrefix = (coin = COIN.XEC, cashAddress: string) => {
  if (cashAddress) {
    let changeAddress = '';

    switch (coin) {
      case COIN.XEC:
        const { type: typeXEC, hash: hashXEC } = cashaddr.decode(cashAddress, false);
        changeAddress = cashaddr.encode('ecash', typeXEC, hashXEC);
        break;
      case COIN.XRG:
        const { type: typeXRG, hash: hashXRG } = ergonCashaddr.decode(cashAddress);
        changeAddress = ergonCashaddr.encode('ergon', typeXRG, hashXRG);
        break;
    }
    return changeAddress;
  }
};

export const convertHashToXAddress = (XPI: any, hash: string | Buffer) => {
  const legacyAddress = XPI.Address.hash160ToLegacy(hash);
  const xAddress = XPI.Address.toXAddress(legacyAddress);

  return xAddress;
};
