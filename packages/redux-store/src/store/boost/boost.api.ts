import { api } from './boost.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Boost'],
  endpoints: {
    CreateBoost: {}
  }
});

export { enhancedApi as api };

export const { useCreateBoostMutation } = enhancedApi;
