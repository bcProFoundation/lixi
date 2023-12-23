import { api } from './burn.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Burn', 'BurnTimeline'],
  endpoints: {
    PostBurnHistory: {
      providesTags: (result, error, arg) => ['BurnTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.postBurnHistory.edges.push(...responseData.postBurnHistory.edges);
        currentCacheData.postBurnHistory.pageInfo = responseData.postBurnHistory.pageInfo;
        currentCacheData.postBurnHistory.totalCount = responseData.postBurnHistory.totalCount;
      }
    }
  }
});

export { enhancedApi as api };

export const { usePostBurnHistoryQuery, useLazyPostBurnHistoryQuery } = enhancedApi;
