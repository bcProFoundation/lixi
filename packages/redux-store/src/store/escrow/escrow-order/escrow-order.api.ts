import { api } from './escrow-order.generated';
import { DisputeStatus, EscrowOrderStatus } from '../../../generated/types.generated';
import _ from 'lodash';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['EscrowOrder', 'EscrowOrderTimeline'],
  endpoints: {
    EscrowOrder: {
      providesTags: ['EscrowOrder']
    },
    CreateEscrowOrder: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['EscrowOrderTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = result.createEscrowOrder.id;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Post',
                        ...result.createEscrowOrder
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
    GetModeratorAccount: {},
    GetRandomArbitratorAccount: {},
    AllEscrowOrderByAccount: {
      providesTags: ['EscrowOrderTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { escrowOrderStatus } = queryArgs;
          return { escrowOrderStatus };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allEscrowOrderByAccount.edges.push(...responseData.allEscrowOrderByAccount.edges);
        currentCacheData.allEscrowOrderByAccount.pageInfo = responseData.allEscrowOrderByAccount.pageInfo;
        currentCacheData.allEscrowOrderByAccount.totalCount = responseData.allEscrowOrderByAccount.totalCount;
      }
    },
    AllEscrowOrderByOfferId: {
      providesTags: ['EscrowOrderTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { offerId, escrowOrderStatus } = queryArgs;
          return { offerId, escrowOrderStatus };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allEscrowOrderByOfferId.edges.push(...responseData.allEscrowOrderByOfferId.edges);
        currentCacheData.allEscrowOrderByOfferId.pageInfo = responseData.allEscrowOrderByOfferId.pageInfo;
        currentCacheData.allEscrowOrderByOfferId.totalCount = responseData.allEscrowOrderByOfferId.totalCount;
      }
    },
    UserRequestTelegramChat: {},
    ArbiRequestTelegramChat: {},
    UpdateEscrowOrderStatus: {},
    FilterUtxos: {}
  }
});

export { enhancedApi as api };

export const {
  useEscrowOrderQuery,
  useLazyEscrowOrderQuery,
  useCreateEscrowOrderMutation,
  useGetRandomArbitratorAccountQuery,
  useLazyGetRandomArbitratorAccountQuery,
  useUpdateEscrowOrderStatusMutation,
  useGetModeratorAccountQuery,
  useLazyGetModeratorAccountQuery,
  useAllEscrowOrderByAccountQuery,
  useLazyAllEscrowOrderByAccountQuery,
  useAllEscrowOrderByOfferIdQuery,
  useLazyAllEscrowOrderByOfferIdQuery,
  useLazyUserRequestTelegramChatQuery,
  useUserRequestTelegramChatQuery,
  useArbiRequestTelegramChatQuery,
  useLazyArbiRequestTelegramChatQuery,
  useFilterUtxosMutation,
  usePrefetch
} = enhancedApi;
