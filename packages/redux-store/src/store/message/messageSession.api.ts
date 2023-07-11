import { EntityState } from '@reduxjs/toolkit';
import { PageInfo } from '@generated/types.generated';
import { api, MessageSessionQuery } from './messageSession.generated';

export interface MessageSessionApiState extends EntityState<MessageSessionQuery['messageSession']> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['MessageSession'],
  endpoints: {
    MessageSession: {
      providesTags: (result, error, arg) => ['MessageSession']
    },
    MessageSessionByPageMessageSessionId: {
      providesTags: (result, error, arg) => ['MessageSession'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allMessageSessionByPageMessageSessionId.edges.push(
          ...responseData.allMessageSessionByPageMessageSessionId.edges
        );
        currentCacheData.allMessageSessionByPageMessageSessionId.pageInfo =
          responseData.allMessageSessionByPageMessageSessionId.pageInfo;
        currentCacheData.allMessageSessionByPageMessageSessionId.totalCount =
          responseData.allMessageSessionByPageMessageSessionId.totalCount;
      }
    },
    CreateMessageSession: {}
  }
});

export { enhancedApi as api };

export const {
  useLazyMessageSessionByPageMessageSessionIdQuery,
  useLazyMessageSessionQuery,
  useMessageSessionByPageMessageSessionIdQuery,
  useCreateMessageSessionMutation,
  useMessageSessionQuery
} = enhancedApi;
