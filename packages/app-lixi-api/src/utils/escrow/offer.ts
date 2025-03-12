import { OfferType } from '@bcpros/lixi-models';
import ReSearch from 'src/common/redis/redis-search';
import {
  IndexNameBuyOffer,
  IndexNameOffer,
  KeyIndexNameBuyOffer,
  KeyIndexNameOffer
} from 'src/modules/escrow/escrow.contants';

export async function createIndexOffer(reSearch: ReSearch, offerType: OfferType) {
  const isBuyOffer = offerType === OfferType.BUY;
  const indexName = isBuyOffer ? IndexNameBuyOffer : IndexNameOffer;
  const keyName = `${isBuyOffer ? KeyIndexNameBuyOffer : KeyIndexNameOffer}:`;

  const doesIndexExist = await reSearch.exist(indexName);
  if (!doesIndexExist) {
    await reSearch.create(indexName, true, ['1', keyName], {
      countryCode: 'TEXT',
      adminCode: 'TEXT',
      city: 'TEXT',
      methods: 'TAG',
      coin: 'TEXT',
      currency: 'TEXT',
      paymentApp: 'TEXT'
    });
  }
}

export function sanitizeLocation(str?: string): string | null {
  return str ? str.replace(/-/g, '_') : null;
}
