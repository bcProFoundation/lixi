import { COIN } from '../constants/coins/coin';
import { COIN_OTHERS, GOODS_SERVICES_UNIT } from '../constants/escrow/escrow';

export function getTickerText(
  localCurrency: string | null | undefined,
  coinPayment: string | null | undefined,
  coinOthers: string | null | undefined,
  priceCoinOthers: number | null | undefined
): string {
  if (localCurrency) {
    return localCurrency;
  }

  if (coinPayment && coinPayment !== COIN_OTHERS) {
    return coinPayment;
  }

  if (priceCoinOthers != null && priceCoinOthers > 0 && coinOthers) {
    return coinOthers;
  }

  return GOODS_SERVICES_UNIT;
}
export function getRealTickerTextOfGoodsServices(currentTicker: string) {
  // Convert goods/services unit to XEC for display, otherwise return as-is
  return currentTicker === GOODS_SERVICES_UNIT ? COIN.XEC : currentTicker;
}
