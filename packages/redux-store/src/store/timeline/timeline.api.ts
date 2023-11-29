import { api } from './timeline.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Timeline', 'CommentCreated'],
  endpoints: {
    HomeTimeline: {
      providesTags: ['Timeline', 'CommentCreated'],
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
    },
    ProfileTimeline: {
      providesTags: ['Timeline', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.profileTimeline.edges.push(...responseData.profileTimeline.edges);
        currentCacheData.profileTimeline.pageInfo = responseData.profileTimeline.pageInfo;
        currentCacheData.profileTimeline.totalCount = responseData.profileTimeline.totalCount;
      }
    },
    PageTimeline: {
      providesTags: ['Timeline', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.pageTimeline.edges.push(...responseData.pageTimeline.edges);
        currentCacheData.pageTimeline.pageInfo = responseData.pageTimeline.pageInfo;
        currentCacheData.pageTimeline.totalCount = responseData.pageTimeline.totalCount;
      }
    },
    PageTimelineByTime: {
      providesTags: ['Timeline', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, level, showNegative, ...otherArgs } = queryArgs;
          return { id, level, showNegative };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.pageTimelineByTime.edges.push(...responseData.pageTimelineByTime.edges);
        currentCacheData.pageTimelineByTime.pageInfo = responseData.pageTimelineByTime.pageInfo;
        currentCacheData.pageTimelineByTime.totalCount = responseData.pageTimelineByTime.totalCount;
      }
    },
    TokenTimeline: {
      providesTags: ['Timeline', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.tokenTimeline.edges.push(...responseData.tokenTimeline.edges);
        currentCacheData.tokenTimeline.pageInfo = responseData.tokenTimeline.pageInfo;
        currentCacheData.tokenTimeline.totalCount = responseData.tokenTimeline.totalCount;
      }
    }
  }
});

export { enhancedApi as api };

export const {
  useTimelineQuery,
  useLazyTimelineQuery,
  useHomeTimelineQuery,
  useLazyHomeTimelineQuery,
  usePageTimelineQuery,
  useLazyPageTimelineQuery,
  usePageTimelineByTimeQuery,
  useLazyPageTimelineByTimeQuery,
  useProfileTimelineQuery,
  useLazyProfileTimelineQuery,
  useTokenTimelineQuery,
  useLazyTokenTimelineQuery
} = enhancedApi;
