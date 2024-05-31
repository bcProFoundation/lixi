import { fromSmallestDenomination } from '@utils/cashMethods';
import BigNumber from 'bignumber.js';

import { coinInfo, COIN } from '@bcpros/lixi-models';

// Validate cash amount
export const shouldRejectAmountInput = (cashAmount, totalCashBalance) => {
  // Take cashAmount as input, a string from form input
  let error = '';
  const testedAmount = new BigNumber(cashAmount);

  // if (selectedCurrency !== coinInfo[COIN.XPI].ticker) {
  //     // Ensure no more than coinInfo[COIN.XPI].cashDecimals decimal places
  //     testedAmount = new BigNumber(fiatToCrypto(cashAmount, 'USD'));
  // }

  // Validate value for > 0
  if (isNaN(testedAmount.toNumber())) {
    error = 'Amount must be a number';
  } else if (testedAmount.lte(0)) {
    error = 'Amount must be greater than 0';
  } else if (testedAmount.lt(fromSmallestDenomination(coinInfo[COIN.XPI].dustSats).toString())) {
    error = `Send amount must be at least ${fromSmallestDenomination(coinInfo[COIN.XPI].dustSats).toString()} ${coinInfo[COIN.XPI].ticker
      }`;
  } else if (testedAmount.gt(totalCashBalance)) {
    error = `Amount cannot exceed your ${coinInfo[COIN.XPI].ticker} balance`;
  } else if (!isNaN(testedAmount.toNumber()) && testedAmount.toString().includes('.')) {
    if (testedAmount.toString().split('.')[1].length > coinInfo[COIN.XPI].cashDecimals) {
      error = `${coinInfo[COIN.XPI].ticker} transactions do not support more than ${coinInfo[COIN.XPI].cashDecimals
        } decimal places`;
    }
  }
  // return false if no error, or string error msg if error
  return error;
};

export const fiatToCrypto = (fiatAmount, fiatPrice, cashDecimals = coinInfo[COIN.XPI].cashDecimals) => {
  const cryptoAmount = new BigNumber(fiatAmount).div(new BigNumber(fiatPrice)).toFixed(cashDecimals);
  return cryptoAmount;
};

export const isValidTokenName = tokenName => {
  return typeof tokenName === 'string' && tokenName.length > 0 && tokenName.length < 68;
};

export const isValidLixiName = (lixiName: string) => {
  return typeof lixiName === 'string' && lixiName.length > 0 && lixiName.length < 100;
};

export const isValidAmountInput = (cashAmount: string) => {
  if (cashAmount === '') return true;
  const testedAmount = new BigNumber(cashAmount);
  return !testedAmount.isNaN() && testedAmount.isFinite() && testedAmount.isPositive();
};
