import { DisputeStatus } from '../../../generated/types.generated';
import { api } from './dispute.generated';
import { api as escrowApi } from '../escrow-order/escrow-order.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Dispute', 'DisputeTimeline'],
  endpoints: {
    AllDisputeByAccount: {
      providesTags: ['DisputeTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { disputeStatus } = queryArgs;
          return { disputeStatus };
        }
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allDisputeByAccount.edges.push(...responseData.allDisputeByAccount.edges);
        currentCacheData.allDisputeByAccount.pageInfo = responseData.allDisputeByAccount.pageInfo;
        currentCacheData.allDisputeByAccount.totalCount = responseData.allDisputeByAccount.totalCount;
      }
    },
    CreateDispute: {
      onQueryStarted: async ({ input }, { dispatch, queryFulfilled }) => {
        const { createdBy, escrowOrderId, reason } = input;
        try {
          const { data } = await queryFulfilled;
          if (data) {
            const { id } = data.createDispute;
            dispatch(
              escrowApi.util.updateQueryData('EscrowOrder', { id: escrowOrderId }, draft => {
                if (draft) {
                  draft.escrowOrder.dispute = {
                    id,
                    createdBy,
                    reason,
                    status: DisputeStatus.Active
                  };
                }
              })
            );
          }
        } catch (e) {
          console.error(e);
        }
      }
    },
    UpdateDispute: {},
    Dispute: {}
  }
});

export { enhancedApi as api };

export const {
  useCreateDisputeMutation,
  useDisputeQuery,
  useUpdateDisputeMutation,
  useLazyDisputeQuery,
  useAllDisputeByAccountQuery,
  useLazyAllDisputeByAccountQuery
} = enhancedApi;
