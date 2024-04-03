import * as cashaddr from 'ecashaddrjs';

export const parseEcashAddress = (cashAddress: string) => {
  if (cashAddress) {
    const { type, hash } = cashaddr.decode(cashAddress);
    const changeAddress = cashaddr.encode('ecash', type, hash);

    return changeAddress;
  }
};
