import { api } from './offer.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Offer', 'OfferTimeline'],
  endpoints: {
    Offer: {},
    AllOffer: {
      providesTags: ['OfferTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { after, first } = queryArgs;
          return { first };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allOffer.edges.push(...responseData.allOffer.edges);
        currentCacheData.allOffer.pageInfo = responseData.allOffer.pageInfo;
        currentCacheData.allOffer.totalCount = responseData.allOffer.totalCount;
      }
    },
    AllOfferByPublicKey: {},
    CreateOffer: {}
  }
});

export { enhancedApi as api };

export const {
  useOfferQuery,
  useLazyOfferQuery,
  useAllOfferQuery,
  useLazyAllOfferQuery,
  useAllOfferByPublicKeyQuery,
  useLazyAllOfferByPublicKeyQuery,
  useCreateOfferMutation
} = enhancedApi;
