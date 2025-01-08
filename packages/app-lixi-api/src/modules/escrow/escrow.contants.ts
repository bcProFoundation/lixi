import { EscrowOrderStatus } from '@bcpros/lixi-models';

export const IndexNameOffer = 'OfferFilterIndex';
export const TIMELINE_ESCROW_ORDER = {
  active: `${EscrowOrderStatus.ACTIVE}-${EscrowOrderStatus.PENDING}-${EscrowOrderStatus.ESCROW}`,
  unactive: `${EscrowOrderStatus.CANCEL}-${EscrowOrderStatus.COMPLETE}`
};

export const COIN_OTHERS = 'Others';
