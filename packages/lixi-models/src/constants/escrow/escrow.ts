export const COIN_OTHERS = 'Others';
export const GOODS_SERVICES_UNIT = 'unit';

/**
 * Offer category to distinguish XEC trading vs Goods & Services marketplace
 * - XEC_TRADING: Traditional P2P exchange (buying/selling XEC for fiat/crypto)
 * - GOODS_SERVICES: Marketplace for goods and services (paid in XEC)
 */
export enum OfferCategory {
  XEC_TRADING = 'XEC_TRADING', // P2P XEC trading (default when null)
  GOODS_SERVICES = 'GOODS_SERVICES' // Goods & Services marketplace
}
