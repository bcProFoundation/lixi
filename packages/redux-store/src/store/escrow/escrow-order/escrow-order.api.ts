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
    UpdateEscrowOrderStatus: {
      onQueryStarted: async ({ input }, { dispatch, queryFulfilled }) => {
        const { orderId, status, txid, value, outIdx } = input;
        try {
          const { data } = await queryFulfilled;
          if (data) {
            dispatch(
              api.util.updateQueryData('EscrowOrder', { id: orderId }, draft => {
                if (draft) {
                  draft.escrowOrder.escrowOrderStatus = status;
                  draft.escrowOrder.updatedAt = data.updateEscrowOrderStatus.updatedAt;

                  switch (status) {
                    case EscrowOrderStatus.Complete:
                      draft.escrowOrder.releaseTxid = txid;
                      if (draft.escrowOrder.dispute) {
                        draft.escrowOrder.dispute.status = DisputeStatus.Resolved;
                      }

                      //remove from escrow cache
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Escrow },
                          draft => {
                            if (draft) {
                              draft.allEscrowOrderByAccount.edges = draft.allEscrowOrderByAccount.edges.filter(
                                item => item.node.id !== orderId
                              );
                              draft.allEscrowOrderByAccount.totalCount = draft.allEscrowOrderByAccount.edges.length;
                              draft.allEscrowOrderByAccount.pageInfo.startCursor =
                                draft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              draft.allEscrowOrderByAccount.pageInfo.endCursor =
                                draft.allEscrowOrderByAccount.edges[draft.allEscrowOrderByAccount.edges.length - 1]
                                  ?.cursor || null;
                            }
                          }
                        )
                      );

                      //add to complete cache
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Complete },
                          localDraft => {
                            if (localDraft) {
                              localDraft.allEscrowOrderByAccount.edges.unshift({
                                cursor: orderId,
                                node: {
                                  ...draft.escrowOrder
                                }
                              });
                              localDraft.allEscrowOrderByAccount.totalCount =
                                localDraft.allEscrowOrderByAccount.edges.length;
                              localDraft.allEscrowOrderByAccount.pageInfo.startCursor =
                                localDraft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              localDraft.allEscrowOrderByAccount.pageInfo.endCursor =
                                localDraft.allEscrowOrderByAccount.edges[
                                  localDraft.allEscrowOrderByAccount.edges.length - 1
                                ]?.cursor || null;
                            }
                          }
                        )
                      );

                      break;

                    case EscrowOrderStatus.Cancel:
                      draft.escrowOrder.returnTxid = txid;
                      if (draft.escrowOrder.dispute) {
                        draft.escrowOrder.dispute.status = DisputeStatus.Resolved;
                      }

                      //remove from escorw cache
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Escrow },
                          draft => {
                            if (draft) {
                              draft.allEscrowOrderByAccount.edges = draft.allEscrowOrderByAccount.edges.filter(
                                item => item.node.id !== orderId
                              );
                              draft.allEscrowOrderByAccount.totalCount = draft.allEscrowOrderByAccount.edges.length;
                              draft.allEscrowOrderByAccount.pageInfo.startCursor =
                                draft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              draft.allEscrowOrderByAccount.pageInfo.endCursor =
                                draft.allEscrowOrderByAccount.edges[draft.allEscrowOrderByAccount.edges.length - 1]
                                  ?.cursor || null;
                            }
                          }
                        )
                      );

                      //add to complete cache because complete/cancel status is the same in this case
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Complete },
                          localDraft => {
                            if (localDraft) {
                              localDraft.allEscrowOrderByAccount.edges.unshift({
                                cursor: orderId,
                                node: {
                                  ...draft.escrowOrder
                                }
                              });
                              localDraft.allEscrowOrderByAccount.totalCount =
                                localDraft.allEscrowOrderByAccount.edges.length;
                              localDraft.allEscrowOrderByAccount.pageInfo.startCursor =
                                localDraft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              localDraft.allEscrowOrderByAccount.pageInfo.endCursor =
                                localDraft.allEscrowOrderByAccount.edges[
                                  localDraft.allEscrowOrderByAccount.edges.length - 1
                                ]?.cursor || null;
                            }
                          }
                        )
                      );

                      break;
                    case EscrowOrderStatus.Escrow:
                      txid &&
                        value &&
                        !_.isNil(outIdx) &&
                        draft.escrowOrder.escrowTxids.push({
                          txid,
                          value,
                          outIdx: outIdx
                        });

                      //remove from pending cache
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Pending },
                          draft => {
                            if (draft) {
                              draft.allEscrowOrderByAccount.edges = draft.allEscrowOrderByAccount.edges.filter(
                                item => item.node.id !== orderId
                              );
                              draft.allEscrowOrderByAccount.totalCount = draft.allEscrowOrderByAccount.edges.length;
                              draft.allEscrowOrderByAccount.pageInfo.startCursor =
                                draft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              draft.allEscrowOrderByAccount.pageInfo.endCursor =
                                draft.allEscrowOrderByAccount.edges[draft.allEscrowOrderByAccount.edges.length - 1]
                                  ?.cursor || null;
                            }
                          }
                        )
                      );

                      //add to escrow cache
                      dispatch(
                        api.util.updateQueryData(
                          'AllEscrowOrderByAccount',
                          { escrowOrderStatus: EscrowOrderStatus.Escrow },
                          localDraft => {
                            if (localDraft) {
                              localDraft.allEscrowOrderByAccount.edges.unshift({
                                cursor: orderId,
                                node: {
                                  ...draft.escrowOrder
                                }
                              });
                              localDraft.allEscrowOrderByAccount.totalCount =
                                localDraft.allEscrowOrderByAccount.edges.length;
                              localDraft.allEscrowOrderByAccount.pageInfo.startCursor =
                                localDraft.allEscrowOrderByAccount.edges[0]?.cursor || null;
                              localDraft.allEscrowOrderByAccount.pageInfo.endCursor =
                                localDraft.allEscrowOrderByAccount.edges[
                                  localDraft.allEscrowOrderByAccount.edges.length - 1
                                ]?.cursor || null;
                            }
                          }
                        )
                      );

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
    },
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
