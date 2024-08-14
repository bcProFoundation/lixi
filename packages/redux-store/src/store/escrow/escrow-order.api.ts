import { EscrowOrderStatus } from '@bcpros/lixi-models';
import { api } from './escrow-order.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['EscrowOrder'],
  endpoints: {
    EscrowOrder: {},
    CreateEscrowOrder: {},
    UpdateEscrowOrderStatus: {
      onQueryStarted: async ({ orderId, status, txid }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            api.util.updateQueryData('EscrowOrder', { id: orderId }, draft => {
              if (draft) {
                draft.escrowOrder.status = status;
                draft.escrowOrder.updatedAt = data.updateEscrowOrderStatus.updatedAt;

                switch (status) {
                  case 'ESCROW':
                    draft.escrowOrder.escrowTxid = txid;
                    break;
                  case 'COMPLETE':
                    draft.escrowOrder.releaseTxid = txid;
                    break;
                  case 'CANCEL':
                    draft.escrowOrder.cancelTxid = txid;
                    break;
                }
              }
            })
          );
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
  useUpdateEscrowOrderStatusMutation
} = enhancedApi;
