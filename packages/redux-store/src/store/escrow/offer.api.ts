import { api } from './offer.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Offer', 'OfferTimeline'],
  endpoints: {
    AllOffer: {},
    CreateOffer: {}
  }
});

export { enhancedApi as api };

export const { useAllOfferQuery, useCreateOfferMutation } = enhancedApi;
