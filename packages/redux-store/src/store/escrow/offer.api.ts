import { api } from './offer.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Offer', 'OfferTimeline'],
  endpoints: {
    AllOffer: {},
    AllOfferByPublicKey: {},
    CreateOffer: {}
  }
});

export { enhancedApi as api };

export const {
  useAllOfferQuery,
  useLazyAllOfferQuery,
  useAllOfferByPublicKeyQuery,
  useLazyAllOfferByPublicKeyQuery,
  useCreateOfferMutation
} = enhancedApi;
