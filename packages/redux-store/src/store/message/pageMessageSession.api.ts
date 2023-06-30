import { EntityState } from '@reduxjs/toolkit';
import { PageInfo } from '@generated/types.generated';
import { api, PageMessageSessionQuery } from './pageMessageSession.generated';

export interface PageMessageSessionApiState extends EntityState<PageMessageSessionQuery['pageMessageSession']> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['PageMessageSession'],
  endpoints: {
    PageMessageSession: {
      providesTags: (result, error, arg) => ['PageMessageSession']
    },
    PageMessageSessionByPageId: {
      providesTags: (result, error, arg) => ['PageMessageSession'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPageMessageSessionByPageId.edges.push(...responseData.allPageMessageSessionByPageId.edges);
        currentCacheData.allPageMessageSessionByPageId.pageInfo = responseData.allPageMessageSessionByPageId.pageInfo;
        currentCacheData.allPageMessageSessionByPageId.totalCount =
          responseData.allPageMessageSessionByPageId.totalCount;
      }
    },
    PageMessageSessionByAccountId: {
      providesTags: (result, error, arg) => ['PageMessageSession'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPageMessageSessionByAccountId.edges.push(
          ...responseData.allPageMessageSessionByAccountId.edges
        );
        currentCacheData.allPageMessageSessionByAccountId.pageInfo =
          responseData.allPageMessageSessionByAccountId.pageInfo;
        currentCacheData.allPageMessageSessionByAccountId.totalCount =
          responseData.allPageMessageSessionByAccountId.totalCount;
      }
    },
    CreatePageMessageSession: {}
  }
});

export { enhancedApi as api };

export const {
  useCreatePageMessageSessionMutation,
  useLazyPageMessageSessionByAccountIdQuery,
  useLazyPageMessageSessionByPageIdQuery,
  useLazyPageMessageSessionQuery,
  usePageMessageSessionByAccountIdQuery,
  usePageMessageSessionByPageIdQuery,
  usePageMessageSessionQuery
} = enhancedApi;
