import { api } from './tokens.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Token', 'Tokens'],
  endpoints: {
    Tokens: {
      providesTags: ['Tokens'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { orderBy, ...otherArgs } = queryArgs;
          return orderBy;
        }
        return { queryArgs };
      }
    },
    Token: {
      providesTags: (result, error, arg) => ['Token']
    },
    createToken: {
      invalidatesTags: ['Tokens']
    }
  }
});

export { enhancedApi as api };

export const { useTokenQuery, useLazyTokenQuery, useTokensQuery, useLazyTokensQuery, useCreateTokenMutation } =
  enhancedApi;
