import { api } from './pages.generated';

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Page', 'Pages'],
  endpoints: {
    Pages: {
      providesTags: ['Pages'],
      serializeQueryArgs({ queryArgs }) {
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPages.edges.push(...responseData.allPages.edges);
        currentCacheData.allPages.pageInfo = responseData.allPages.pageInfo;
        currentCacheData.allPages.totalCount = responseData.allPages.totalCount;
      }
    },
    PagesByFollower: {
      providesTags: ['Pages'],
      serializeQueryArgs({ queryArgs }) {
        return {};
      },
      merge(currentCacheData, responseData) {
        currentCacheData.pagesByFollower.edges.push(...responseData.pagesByFollower.edges);
        currentCacheData.pagesByFollower.pageInfo = responseData.pagesByFollower.pageInfo;
        currentCacheData.pagesByFollower.totalCount = responseData.pagesByFollower.totalCount;
      }
    },
    PagesByUserId: {
      providesTags: ['Pages'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPagesByUserId.edges.push(...responseData.allPagesByUserId.edges);
        currentCacheData.allPagesByUserId.pageInfo = responseData.allPagesByUserId.pageInfo;
        currentCacheData.allPagesByUserId.totalCount = responseData.allPagesByUserId.totalCount;
      }
    },
    Page: {
      providesTags: (result, error, arg) => {
        return [{ type: 'Page', id: arg.id }];
      }
    },
    createPage: {
      invalidatesTags: ['Pages', 'Page']
    },
    updatePage: {
      invalidatesTags: ['Pages', 'Page']
    }
  }
});

export { enhancedApi as api };

export const {
  usePageQuery,
  useLazyPageQuery,
  usePagesQuery,
  usePagesByFollowerQuery,
  useLazyPagesByFollowerQuery,
  useLazyPagesQuery,
  useCreatePageMutation,
  useLazyPagesByUserIdQuery,
  usePagesByUserIdQuery,
  useUpdatePageMutation
} = enhancedApi;
