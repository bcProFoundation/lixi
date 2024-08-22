import { DisputeStatus } from '../../generated/types.generated';
import { api } from './dispute.generated';
import { api as escrowApi } from './escrow-order.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Dispute'],
  endpoints: {
    CreateDispute: {
      onQueryStarted: async ({ input }, { dispatch, queryFulfilled }) => {
        const { createdBy, escrowOrderId, reason } = input;
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(
              escrowApi.util.updateQueryData('EscrowOrder', { id: escrowOrderId }, draft => {
                if (draft) {
                  draft.escrowOrder.dispute = {
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

export const { useCreateDisputeMutation, useDisputeQuery, useUpdateDisputeMutation, useLazyDisputeQuery } = enhancedApi;
