import { COIN, coinInfo } from '../constants';

export function isValidLotusPrefix(addressString: string, coin: COIN) {
  // Note that this function validates prefix only
  // Check for prefix included in currency.prefixes array
  // For now, validation is handled by converting to bitcoincash: prefix and checksum
  // and relying on legacy validation methods of bitcoincash: prefix addresses

  // Also accept an address with no prefix, as some exchanges provide these
  for (let i = 0; i < coinInfo[coin].prefixes.length; i += 1) {
    // If the addressString being tested starts with an accepted prefix or no prefix at all
    if (addressString.startsWith(coinInfo[coin].prefixes[i])) {
      return true;
    }
  }
  return false;
}
