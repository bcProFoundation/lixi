import BigNumber from 'bignumber.js';
import cashaddr from 'ecashaddrjs';
import { coinInfo, COIN } from '@bcpros/lixi-models/constants';

export interface AddressInfo {
  address: string;
  isValid: boolean;
  queryString: string;
  amount: number;
}

export function parseAddress(XPI: any, addressString: string): AddressInfo {
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
    isValidAddress = XPI.Address.isXAddress(cleanAddress);
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
          .div(10 ** coinInfo[COIN.XPI].cashDecimals)
          .toString();
      } catch (err) {
        amount = null;
      }
    }
  }
  addressInfo.amount = amount;
  return addressInfo;
}

export const parseEcashAddress = (cashAddress: string) => {
  if (cashAddress) {
    const { type, hash } = cashaddr.decode(cashAddress);
    const changeAddress = cashaddr.encode('ecash', type, hash);

    return changeAddress;
  }
};
