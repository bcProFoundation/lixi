import { POST_TYPE } from '@bcpros/lixi-models/constants/post';
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
    AllOfferByAccount: {
      providesTags: ['OfferTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { offerStatus } = queryArgs;
          return { offerStatus };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allOfferByAccount.edges.push(...responseData.allOfferByAccount.edges);
        currentCacheData.allOfferByAccount.pageInfo = responseData.allOfferByAccount.pageInfo;
        currentCacheData.allOfferByAccount.totalCount = responseData.allOfferByAccount.totalCount;
      }
    },
    CreateOffer: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['OfferTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.OFFER}:${result.createOffer.id}`;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Post',
                        ...result.createOffer
                      }
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }
        } catch {}
      }
    }
  }
});

export { enhancedApi as api };

export const {
  useOfferQuery,
  useLazyOfferQuery,
  useAllOfferQuery,
  useLazyAllOfferQuery,
  useAllOfferByAccountQuery,
  useLazyAllOfferByAccountQuery,
  useCreateOfferMutation
} = enhancedApi;
