export const convertHashToXAddress = (XPI: any, hash: string | Buffer) => {
  const legacyAddress = XPI.Address.hash160ToLegacy(hash);
  const xAddress = XPI.Address.toXAddress(legacyAddress);

  return xAddress;
};
