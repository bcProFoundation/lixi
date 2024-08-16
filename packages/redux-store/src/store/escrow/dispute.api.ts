import { api } from './dispute.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Dispute'],
  endpoints: {
    CreateDispute: {},
    UpdateDispute: {},
    Dispute: {}
  }
});

export { enhancedApi as api };

export const { useCreateDisputeMutation, useDisputeQuery, useUpdateDisputeMutation, useLazyDisputeQuery } = enhancedApi;
