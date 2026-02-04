export const COIN_OTHERS = 'Others';
export const GOODS_SERVICES_UNIT = 'unit';

/**
 * Payment type for Goods & Services offers
 * - IN_APP: Buyer pays XEC through the escrow system (traditional flow)
 * - EXTERNAL: Payment arranged outside the system (seller provides collateral)
 */
export enum GoodsServicesPaymentType {
    IN_APP = 'IN_APP',       // Buyer pays XEC in-app (default)
    EXTERNAL = 'EXTERNAL'     // Payment outside system, seller escrows as collateral
}
