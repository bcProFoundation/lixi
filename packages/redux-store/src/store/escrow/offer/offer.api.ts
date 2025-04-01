import { POST_TYPE } from '@bcpros/lixi-models/constants/post';
import { api } from './offer.generated';
import { OfferStatus } from '../../../generated/types.generated';

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
    allOfferActiveByAccountId: {
      providesTags: ['OfferTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { accountId } = queryArgs;
          return { accountId };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allOfferActiveByAccountId.edges.push(...responseData.allOfferActiveByAccountId.edges);
        currentCacheData.allOfferActiveByAccountId.pageInfo = responseData.allOfferActiveByAccountId.pageInfo;
        currentCacheData.allOfferActiveByAccountId.totalCount = responseData.allOfferActiveByAccountId.totalCount;
      }
    },
    OfferByFilter: {
      providesTags: ['OfferTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { offerFilterInput } = queryArgs;
          return { offerFilterInput };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.offerByFilter.edges.push(...responseData.offerByFilter.edges);
        currentCacheData.offerByFilter.pageInfo = responseData.offerByFilter.pageInfo;
        currentCacheData.offerByFilter.totalCount = responseData.offerByFilter.totalCount;
      }
    },
    OfferByFilterDatabase: {
      providesTags: ['OfferTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { offerFilterInput } = queryArgs;
          return { offerFilterInput };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.offerByFilterDatabase.edges.push(...responseData.offerByFilterDatabase.edges);
        currentCacheData.offerByFilterDatabase.pageInfo = responseData.offerByFilterDatabase.pageInfo;
        currentCacheData.offerByFilterDatabase.totalCount = responseData.offerByFilterDatabase.totalCount;
      }
    },
    CreateOffer: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['OfferTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            //dont add to archived
            if (endpointName === 'AllOfferByAccount' && originalArgs?.offerStatus === OfferStatus.Archive) continue;
            if (endpointName !== 'AllOfferByAccount' && result?.createOffer?.postOffer?.hideFromHome) continue;
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
    },
    UpdateOffer: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          // const { message, marginPercentage } = result.updateOffer;

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['OfferTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.OFFER}:${result.updateOffer.postId}`;
                  const timelineItemToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === timelineId);
                  if (timelineItemToUpdateIndex === -1) return;
                  draft[field].edges[timelineItemToUpdateIndex].node.data.postOffer = result.updateOffer;
                }
              })
            );
          }
        } catch (err) {
          console.log(err);
        }
      }
    },
    UpdateOfferHideFromHome: {
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

                  const timelineId = `${POST_TYPE.OFFER}:${result.UpdateOfferHideFromHome.postId}`;
                  const timelineItemToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === timelineId);
                  if (timelineItemToUpdateIndex === -1) return;
                  draft[field].edges[timelineItemToUpdateIndex].node.data.postOffer = result.UpdateOfferHideFromHome;
                }
              })
            );
          }
        } catch (err) {
          console.log(err);
        }
      }
    },
    UpdateOfferStatus: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          const timelineId = `${POST_TYPE.OFFER}:${result.updateOfferStatus.id}`;

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['OfferTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            //remove offer in ACTIVE
            if (endpointName === 'AllOfferByAccount' && originalArgs?.offerStatus === OfferStatus.Active) {
              dispatch(
                enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                  const fields = Object.keys(draft);
                  for (const field of fields) {
                    if (!draft[field]) continue;

                    const timelineItemToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === timelineId);
                    if (timelineItemToUpdateIndex === -1 || draft[field].edges.length === 0) return;
                    draft[field].edges.splice(timelineItemToUpdateIndex, 1);
                    draft[field].totalCount = draft[field].totalCount - 1;
                  }
                })
              );
            }

            //add offer to ARCHIVED
            if (endpointName === 'AllOfferByAccount' && originalArgs?.offerStatus === OfferStatus.Archive) {
              dispatch(
                enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                  const fields = Object.keys(draft);
                  for (const field of fields) {
                    if (!draft[field]) continue;

                    draft[field].edges.unshift({
                      cursor: timelineId,
                      node: {
                        id: timelineId,
                        data: {
                          __typename: 'Post',
                          ...result.updateOfferStatus
                        }
                      }
                    });
                    draft[field].totalCount = draft[field].totalCount + 1;
                  }
                })
              );
            }
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
  useAllOfferActiveByAccountIdQuery,
  useLazyAllOfferActiveByAccountIdQuery,
  useOfferByFilterQuery,
  useLazyOfferByFilterQuery,
  useOfferByFilterDatabaseQuery,
  useLazyOfferByFilterDatabaseQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useUpdateOfferHideFromHomeMutation,
  useUpdateOfferStatusMutation
} = enhancedApi;
