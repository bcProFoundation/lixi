import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';

export const calBurnAmountWithFee = (value: number, burnAmountPerCoin: number, rounded: boolean) => {
  const totalBurn = value * burnAmountPerCoin * (coinInfo[COIN.XPI].burnFee + 1);
  return rounded ? Math.ceil(totalBurn) : totalBurn;
};

export const calBurnAmountWithoutFee = (value: number, burnAmountPerCoin: number, rounded: boolean) => {
  const totalBurn = value * burnAmountPerCoin;
  return rounded ? Math.ceil(totalBurn) : totalBurn;
};
