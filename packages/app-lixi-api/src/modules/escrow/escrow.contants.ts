import { EscrowOrderStatus } from '@bcpros/lixi-models';

//this is name of Index (redis-search)
export const IndexNameOffer = 'OfferFilterIndex';
export const IndexNameBuyOffer = 'BuyOfferFilterIndex';

//this is name of key-doc (redis-search)
export const KeyIndexNameOffer = 'docOffer';
export const KeyIndexNameBuyOffer = 'docBuyOffer';

//this is name of key-cache
export const KeyCacheNameOffer = 'offer';
export const KeyCacheNameBuyOffer = 'buyOffer';

export const KEY_AVATAR_PATH = 'locale_cash_avatar_path';

export const TIMELINE_ESCROW_ORDER = {
  active: `${EscrowOrderStatus.ACTIVE}-${EscrowOrderStatus.PENDING}-${EscrowOrderStatus.ESCROW}`,
  unactive: `${EscrowOrderStatus.CANCEL}-${EscrowOrderStatus.COMPLETE}`
};

export const COIN_OTHERS = 'Others';
