import { api } from './escrow-order.generated';
import { DisputeStatus } from '../../../generated/types.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['EscrowOrder', 'EscrowOrderTimeline'],
  endpoints: {
    EscrowOrder: {},
    CreateEscrowOrder: {},
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
          const { offerId } = queryArgs;
          return { offerId };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allEscrowOrderByOfferId.edges.push(...responseData.allEscrowOrderByOfferId.edges);
        currentCacheData.allEscrowOrderByOfferId.pageInfo = responseData.allEscrowOrderByOfferId.pageInfo;
        currentCacheData.allEscrowOrderByOfferId.totalCount = responseData.allEscrowOrderByOfferId.totalCount;
      }
    },
    UpdateEscrowOrderStatus: {
      onQueryStarted: async ({ input }, { dispatch, queryFulfilled }) => {
        const { orderId, status, txid, value } = input;
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(
              api.util.updateQueryData('EscrowOrder', { id: orderId }, draft => {
                if (draft) {
                  draft.escrowOrder.escrowOrderStatus = status;
                  draft.escrowOrder.updatedAt = data.updateEscrowOrderStatus.updatedAt;

                  switch (status) {
                    case 'COMPLETE':
                      draft.escrowOrder.releaseTxid = txid;
                      if (draft.escrowOrder.dispute) {
                        draft.escrowOrder.dispute.status = DisputeStatus.Resolved;
                      }
                      break;
                    case 'CANCEL':
                      draft.escrowOrder.returnTxid = txid;
                      break;
                    case 'ACTIVE':
                      txid &&
                        value &&
                        draft.escrowOrder.escrowTxids.push({
                          txid,
                          value
                        });
                      break;
                    case 'ESCROW':
                      txid &&
                        value &&
                        draft.escrowOrder.escrowTxids.push({
                          txid,
                          value
                        });
                      break;
                  }
                }
              })
            );
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
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
  useLazyAllEscrowOrderByOfferIdQuery
} = enhancedApi;
