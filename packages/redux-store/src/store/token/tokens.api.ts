import { api } from './tokens.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Token', 'Tokens'],
  endpoints: {
    Tokens: {
      providesTags: ['Tokens'],
      serializeQueryArgs({ queryArgs }) {
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allTokens.edges.push(...responseData.allTokens.edges);
        currentCacheData.allTokens.pageInfo = responseData.allTokens.pageInfo;
        currentCacheData.allTokens.totalCount = responseData.allTokens.totalCount;
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
