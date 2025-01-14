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
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        try {
          const { createdBy, escrowOrderId, reason } = input;
          const { data: result } = await queryFulfilled;

          dispatch(
            escrowApi.util.updateQueryData('EscrowOrder', { id: escrowOrderId }, draft => {
              if (draft) {
                draft.escrowOrder.dispute = {
                  ...result.createDispute,
                  status: result.createDispute.disputeStatus
                };
              }
            })
          );

          const timelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['DisputeTimeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = result.createDispute.id;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Post',
                        ...result.createDispute
                      }
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }
        } catch (err) {
          console.log('error: ', err);
        }
      }
    },
    UpdateDispute: {
      async onQueryStarted({ input }, { dispatch, queryFulfilled }) {
        const { id, status, escrowOrderId } = input;
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(
              api.util.updateQueryData('Dispute', { id }, draft => {
                if (draft) {
                  draft.dispute.disputeStatus = status;
                  draft.dispute.updatedAt = data.updateDispute.updatedAt;
                }
              })
            );

            dispatch(
              escrowApi.util.updateQueryData('EscrowOrder', { id: escrowOrderId }, draft => {
                if (draft) {
                  draft.escrowOrder.dispute = {
                    ...data.updateDispute,
                    status: data.updateDispute.disputeStatus
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
