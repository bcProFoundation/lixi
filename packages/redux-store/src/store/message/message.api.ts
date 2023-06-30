import { EntityState } from '@reduxjs/toolkit';
import { PageInfo } from '@generated/types.generated';
import { api, MessageQuery } from './message.generated';

export interface MessageApiState extends EntityState<MessageQuery['message']> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Message'],
  endpoints: {
    Message: {
      providesTags: (result, error, arg) => ['Message']
    },
    MessageByMessageSessionId: {
      providesTags: (result, error, arg) => ['Message'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allMessageByMessageSessionId.edges.push(...responseData.allMessageByMessageSessionId.edges);
        currentCacheData.allMessageByMessageSessionId.pageInfo = responseData.allMessageByMessageSessionId.pageInfo;
        currentCacheData.allMessageByMessageSessionId.totalCount = responseData.allMessageByMessageSessionId.totalCount;
      }
    },
    CreateMessage: {}
  }
});

export { enhancedApi as api };

export const {
  useCreateMessageMutation,
  useLazyMessageByMessageSessionIdQuery,
  useLazyMessageQuery,
  useMessageByMessageSessionIdQuery,
  useMessageQuery
} = enhancedApi;
