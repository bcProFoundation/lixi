export const calBurnAmountWithFee = (value: number, burnAmountPerCoin: number, rounded: boolean) => {
  const totalBurn = value * burnAmountPerCoin * 1.04;
  return rounded ? Math.ceil(totalBurn) : totalBurn;
};

export const calBurnAmountWithoutFee = (value: number, burnAmountPerCoin: number, rounded: boolean) => {
  const totalBurn = value * burnAmountPerCoin;
  return rounded ? Math.ceil(totalBurn) : totalBurn;
};
