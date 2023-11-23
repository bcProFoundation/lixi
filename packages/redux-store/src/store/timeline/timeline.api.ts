import { api } from './timeline.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['HomeTimeline', 'ProfileTimeline', 'PageTimeline', 'TokenTimeline', 'CommentCreated'],
  endpoints: {
    HomeTimeline: {
      providesTags: ['HomeTimeline', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { level, ...otherArgs } = queryArgs;
          return { level };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.homeTimeline.edges.push(...responseData.homeTimeline.edges);
        currentCacheData.homeTimeline.pageInfo = responseData.homeTimeline.pageInfo;
        currentCacheData.homeTimeline.totalCount = responseData.homeTimeline.totalCount;
      }
    }
    // ProfileTimeline: {
    //   providesTags: ['ProfileTimeline', 'CommentCreated'],
    //   serializeQueryArgs({ queryArgs }) {
    //     if (queryArgs) {
    //       const { id, ...otherArgs } = queryArgs;
    //       return { id };
    //     }
    //     return { queryArgs };
    //   },
    //   merge(currentCacheData, responseData) {
    //     currentCacheData.profileTimeline.edges.push(...responseData.profileTimeline.edges);
    //     currentCacheData.profileTimeline.pageInfo = responseData.profileTimeline.pageInfo;
    //     currentCacheData.profileTimeline.totalCount = responseData.profileTimeline.totalCount;
    //   }
    // },
    // PageTimeline: {
    //   providesTags: ['PageTimeline', 'CommentCreated'],
    //   serializeQueryArgs({ queryArgs }) {
    //     if (queryArgs) {
    //       const { id, ...otherArgs } = queryArgs;
    //       return { id };
    //     }
    //     return { queryArgs };
    //   },
    //   merge(currentCacheData, responseData) {
    //     currentCacheData.pageTimeline.edges.push(...responseData.pageTimeline.edges);
    //     currentCacheData.pageTimeline.pageInfo = responseData.pageTimeline.pageInfo;
    //     currentCacheData.pageTimeline.totalCount = responseData.pageTimeline.totalCount;
    //   }
    // },
    // TokenTimeline: {
    //   providesTags: ['TokenTimeline', 'CommentCreated'],
    //   serializeQueryArgs({ queryArgs }) {
    //     if (queryArgs) {
    //       const { id, ...otherArgs } = queryArgs;
    //       return { id };
    //     }
    //     return { queryArgs };
    //   },
    //   merge(currentCacheData, responseData) {
    //     currentCacheData.tokenTimeline.edges.push(...responseData.tokenTimeline.edges);
    //     currentCacheData.tokenTimeline.pageInfo = responseData.tokenTimeline.pageInfo;
    //     currentCacheData.tokenTimeline.totalCount = responseData.tokenTimeline.totalCount;
    //   }
    // }
  }
});

export { enhancedApi as api };

export const { useTimelineQuery, useLazyTimelineQuery, useHomeTimelineQuery, useLazyHomeTimelineQuery } = enhancedApi;
